import {
  Episode,
  ItemRequest,
  MediaEntry,
  MediaItem,
  Movie,
  Season,
  Show,
  ShowLikeMediaItem,
  Stream,
  SubtitleEntry,
} from "@repo/util-plugin-sdk/dto/entities";
import { MediaItemState } from "@repo/util-plugin-sdk/dto/enums/media-item-state.enum";
import { MediaItemType } from "@repo/util-plugin-sdk/dto/enums/media-item-type.enum";
import { MediaItemUnion } from "@repo/util-plugin-sdk/dto/unions/media-item.union";

import chalk from "chalk";
import { DateTime } from "luxon";
import assert from "node:assert";
import { validateOrReject } from "class-validator";
import {
  Arg,
  Args,
  Ctx,
  Field,
  FieldResolver,
  ID,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";

import { PaginationArgs } from "#graphql/args/pagination.args.ts";
import { CoreContext } from "#graphql/decorators/core-context.ts";
import { createCursorType } from "#graphql/types/create-cursor-type.ts";
import { clearDeduplicationJob } from "#message-queue/utilities/clear-deduplication-job.ts";
import { queueRegistry } from "#message-queue/utilities/queue-registry.ts";

import type { ApolloServerContext } from "#graphql/context.ts";
import type { UUID } from "node:crypto";
import type { SubscribeResolverData } from "type-graphql";

const MediaItemCursor = createCursorType<MediaItem>(
  "MediaItem",
  MediaItemUnion,
);

@Resolver(() => MediaItem)
export class MediaItemResolver {
  @Subscription(() => MediaItemUnion, {
    description:
      "Emits the media item for the given ID whenever its state changes.",
    topics: "MEDIA_ITEM_STATE_CHANGED",
    topicId: ({ args }: SubscribeResolverData<unknown, { id: UUID }>) =>
      args.id,
  })
  public mediaItemStateChanged(
    @Arg("id", () => ID) _id: UUID,
    @Root() mediaItem: MediaItem,
  ) {
    return mediaItem;
  }

  @Query(() => MediaItemUnion, {
    description:
      "Fetches a media item by its ID. The returned type will be one of the specific media item types (e.g., Movie, Episode) based on the underlying data.",
  })
  public async mediaItemById(
    @CoreContext() { services }: CoreContext,
    @Arg("id", () => ID) id: UUID,
  ) {
    return services.mediaItemService.getMediaItemById(id);
  }

  @Query(() => MediaItemCursor)
  public async mediaItems(
    @Arg("search", () => String, { nullable: true })
    search: string | null,
    @Arg("type", () => [MediaItemType.enum], {
      defaultValue: ["movie", "show"],
    })
    filter: MediaItemType[],
    @Arg("state", () => [MediaItemState.enum], {
      nullable: true,
      defaultValue: [...MediaItemState.options],
    })
    state: MediaItemState[] | null,
    @Arg("includeUnrequestedItems", () => Boolean, { defaultValue: false })
    includeUnrequestedItems: boolean,
    @Args(() => PaginationArgs)
    { after, before, itemsPerPage }: PaginationArgs,
    @CoreContext() { services: { mediaItemService } }: CoreContext,
  ) {
    return mediaItemService.getPaginatedMediaItems({
      filter,
      includeUnrequestedItems,
      itemsPerPage,
      after,
      before,
      ...(state && { state }),
      ...(search && { search }),
    });
  }

  @Query(() => Int)
  public async mediaItemsCount(
    @Arg("type", () => [MediaItemType.enum], {
      defaultValue: MediaItemType.options,
    })
    filter: MediaItemType[],
    @CoreContext() { em }: CoreContext,
  ): Promise<number> {
    return em.count(MediaItem, {
      type: { $in: filter },
    });
  }

  @Query(() => [MediaItemUnion])
  public recentlyAdded() {
    return [];
  }

  @Mutation(() => [MediaItemUnion])
  public async resetMediaItem(
    @Arg("mediaItemId", () => ID) mediaItemId: UUID,
    @CoreContext() { services: { mediaItemService } }: CoreContext,
    @Ctx() { logger }: ApolloServerContext,
  ): Promise<MediaItem[]> {
    const item = await mediaItemService.getMediaItemById(mediaItemId);
    const resetItems = await mediaItemService.resetMediaItem(item);

    const { enqueueProcessMediaItem } =
      await import("#message-queue/flows/process-media-item/enqueue-process-media-item.ts");

    await clearDeduplicationJob(
      "process-media-item",
      `process-${item.type}-${item.id}`,
    );

    await enqueueProcessMediaItem({
      id: item.id,
      isRootItem: mediaItemService.rootItemTypes.has(item.type),
      fanOut: false,
    });

    logger.info(
      `Reset ${chalk.bold(item.fullTitle)} and enqueued for processing.`,
    );

    return [...resetItems];
  }

  @Mutation(() => [MediaItemUnion])
  public async retryMediaItem(
    @Arg("mediaItemId", () => ID) mediaItemId: UUID,
    @CoreContext() { services: { mediaItemService } }: CoreContext,
    @Ctx() { logger }: ApolloServerContext,
  ): Promise<MediaItem[]> {
    const item = await mediaItemService.getMediaItemById(mediaItemId);

    // Reset the item to re-trigger processing (same as reset for failed items)
    const resetItems = await mediaItemService.resetMediaItem(item);

    const { enqueueProcessMediaItem } =
      await import("#message-queue/flows/process-media-item/enqueue-process-media-item.ts");

    await clearDeduplicationJob(
      "process-media-item",
      `process-${item.type}-${item.id}`,
    );

    await enqueueProcessMediaItem({
      id: item.id,
      isRootItem: mediaItemService.rootItemTypes.has(item.type),
      fanOut: false,
    });

    logger.info(
      `Retried ${chalk.bold(item.fullTitle)} and enqueued for processing.`,
    );

    return [...resetItems];
  }

  @Mutation(() => Boolean)
  public async removeMediaItem(
    @Arg("mediaItemId", () => ID) mediaItemId: UUID,
    @CoreContext() {
      services: { mediaItemService, streamService, filesystemEntryService },
      em,
    }: CoreContext,
    @Ctx() { sendEvent, logger }: ApolloServerContext,
  ): Promise<boolean> {
    const item = await mediaItemService.getMediaItemById(mediaItemId);

    // Clear any pending jobs for this item
    await clearDeduplicationJob(
      "process-media-item",
      `process-${item.type}-${item.id}`,
    );

    // Get the full title before deleting
    const fullTitle = item.fullTitle;
    const itemType = item.type;

    // Delete associated streams
    for (const stream of await item.streams.loadItems()) {
      await em.remove(stream).flush();
    }

    // Delete associated filesystem entries
    for (const entry of await item.filesystemEntries.loadItems()) {
      await em.remove(entry).flush();
    }

    // Delete associated blacklisted streams
    for (const entry of await item.blacklistedStreams.loadItems()) {
      await em.remove(entry).flush();
    }

    // Delete the media item itself
    await em.remove(item).flush();

    logger.info(
      `Removed ${chalk.bold(fullTitle)} (${itemType}) from the database.`,
    );

    sendEvent({
      type: "riven.media-item.removed",
      item: { id: mediaItemId, type: itemType, fullTitle },
    });

    return true;
  }

  @Mutation(() => MediaItemUnion)
  public pauseMediaItem(
    @Arg("mediaItemId", () => ID) mediaItemId: UUID,
    @Ctx() { logger }: ApolloServerContext,
  ) {
    logger.warn(`[PLACEHOLDER]: Pausing media item with ID: ${mediaItemId}`);

    return null;
  }

  @Mutation(() => MediaItemUnion)
  public resumeMediaItem(
    @Arg("mediaItemId", () => ID) mediaItemId: UUID,
    @Ctx() { logger }: ApolloServerContext,
  ) {
    logger.warn(`[PLACEHOLDER]: Resuming media item with ID: ${mediaItemId}`);

    return null;
  }

  @Mutation(() => Boolean, {
    description:
      "Manually add a stream (by torrent hash) to a media item and re-process it.",
  })
  public async manualScrape(
    @Arg("mediaItemId", () => ID) mediaItemId: UUID,
    @Arg("infoHash", () => String) infoHash: string,
    @CoreContext() {
      services: { mediaItemService, streamService },
      em,
    }: CoreContext,
    @Ctx() { sendEvent, logger }: ApolloServerContext,
  ): Promise<boolean> {
    const item = await mediaItemService.getMediaItemById(mediaItemId);

    // Validate the infoHash format (40 hex chars for SHA-1)
    const hashPattern = /^[a-fA-F0-9]{40}$/;
    if (!hashPattern.test(infoHash)) {
      throw new Error(
        "Invalid torrent hash. Expected a 40-character hexadecimal string.",
      );
    }

    // Check if this hash already exists for this item
    const existingStream = await em.findOne(Stream, { infoHash });
    if (existingStream) {
      // Check if it's already linked to this item
      const itemStreams = await item.streams.loadItems();
      if (itemStreams.some((s) => s.infoHash === infoHash)) {
        throw new Error(
          `Stream with hash ${infoHash} is already linked to this media item.`,
        );
      }
    }

    // Create a new stream entry with the manual hash
    const stream = em.create(Stream, {
      infoHash,
      parsedData: {
        source: "manual",
        quality: "unknown",
        resolution: "unknown",
        size: 0,
        seeders: 0,
        leechers: 0,
        title: `Manual: ${infoHash}`,
        language: "unknown",
        provider: "manual",
        plugin: "manual",
        publishedAt: DateTime.utc().toJSDate(),
      },
    });

    await validateOrReject(stream);
    await em.flush();

    // Link the stream to the media item
    item.streams.add(stream);

    // Clear any pending jobs for this item
    await clearDeduplicationJob(
      "process-media-item",
      `process-${item.type}-${item.id}`,
    );

    // Re-enqueue the item for processing to update its state
    const { enqueueProcessMediaItem } =
      await import("#message-queue/flows/process-media-item/enqueue-process-media-item.ts");

    await enqueueProcessMediaItem({
      id: item.id,
      isRootItem: mediaItemService.rootItemTypes.has(item.type),
      fanOut: false,
    });

    logger.info(
      `Manually added stream ${chalk.bold(infoHash)} to ${chalk.bold(item.fullTitle)}.`,
    );

    sendEvent({
      type: "riven.media-item.manual-scrape",
      item,
      infoHash,
    });

    return true;
  }

  @Mutation(() => Boolean)
  public async blacklistActiveStream(
    @Arg("mediaItemId", () => ID) mediaItemId: UUID,
    @CoreContext() {
      services: { mediaItemService, streamService },
    }: CoreContext,
    @Ctx() { logger }: ApolloServerContext,
  ) {
    const mediaItem = await mediaItemService.getMediaItemById(mediaItemId);

    assert.ok(
      mediaItem instanceof Movie || mediaItem instanceof Episode,
      "blacklistActiveStream can only be called on Movie or Episode media items",
    );

    const [mediaEntry] = await mediaItem.getMediaEntries();

    assert.ok(mediaEntry, `No media entries found for ${mediaItem.fullTitle}`);

    const { blacklistedItems, infoHash: blacklistedInfoHash } =
      await streamService.blacklistActiveStream({
        mediaItem,
        provider: mediaEntry.provider,
        plugin: mediaEntry.plugin,
      });

    logger.info(
      `Stream ${blacklistedInfoHash} for ${chalk.bold(mediaEntry.originalFilename)} has been blacklisted`,
    );

    const itemsToReprocess = await streamService.calculateItemsToReprocess(
      new Set(blacklistedItems),
    );

    const { enqueueProcessMediaItem } =
      await import("#message-queue/flows/process-media-item/enqueue-process-media-item.ts");

    for (const { id, type } of itemsToReprocess) {
      await clearDeduplicationJob(
        "process-media-item",
        `process-${type}-${id}`,
      );

      await enqueueProcessMediaItem({ id });
    }

    return true;
  }

  @FieldResolver(() => String, {
    description:
      "The primary external ID of the media item (TMDB ID for movies, TVDB ID for shows)",
  })
  public primaryExternalId(@Root() mediaItem: MediaItem) {
    if (mediaItem instanceof ShowLikeMediaItem) {
      return mediaItem.tvdbId;
    }

    if (mediaItem instanceof Movie) {
      return mediaItem.tmdbId;
    }

    throw new Error(
      `Unsupported media item type: ${mediaItem.constructor.name}`,
    );
  }

  @FieldResolver(() => Int)
  public expectedFileCount() {
    throw new Error(
      "expectedFileCount field resolver must be implemented in child resolvers",
    );
  }

  @FieldResolver(() => Stream)
  public async streams(@Root() mediaItem: MediaItem) {
    return mediaItem.streams.loadItems();
  }

  @FieldResolver(() => Int)
  public async streamCount(@Root() mediaItem: MediaItem) {
    return mediaItem.streams.loadCount();
  }

  @FieldResolver(() => Stream)
  public async blacklistedStreams(@Root() mediaItem: MediaItem) {
    return mediaItem.blacklistedStreams.loadItems();
  }

  @FieldResolver(() => Stream)
  public async filesystemEntries(@Root() mediaItem: MediaItem) {
    return mediaItem.filesystemEntries.loadItems();
  }

  @FieldResolver(() => [MediaEntry])
  public async mediaEntries(@Root() mediaItem: MediaItem) {
    return mediaItem.filesystemEntries.loadItems({
      where: {
        type: "media",
      },
    });
  }

  @FieldResolver(() => Int)
  public async mediaEntryCount(@Root() mediaItem: MediaItem) {
    return mediaItem.filesystemEntries.loadCount({
      where: {
        type: "media",
      },
    });
  }

  @FieldResolver(() => Int)
  public async subtitlesCount(@Root() mediaItem: MediaItem) {
    return mediaItem.filesystemEntries.loadCount({
      where: {
        type: "subtitle",
      },
    });
  }

  @FieldResolver(() => [SubtitleEntry])
  public async subtitles(@Root() mediaItem: MediaItem) {
    return mediaItem.subtitles.loadItems();
  }

  @FieldResolver(() => ItemRequest)
  public async itemRequest(@Root() mediaItem: MediaItem) {
    return mediaItem.itemRequest.loadOrFail();
  }

  @FieldResolver(() => Stream)
  public async activeStream(@Root() mediaItem: MediaItem) {
    return mediaItem.activeStream?.loadOrFail();
  }

  @FieldResolver(() => Boolean)
  public hasActiveStream(@Root() mediaItem: MediaItem) {
    return mediaItem.activeStream != null;
  }

  @FieldResolver(() => Int)
  public async childItemCount(
    @Root() mediaItem: MediaItem,
    @Arg("includeSpecials", () => Boolean, { defaultValue: false })
    includeSpecials: boolean,
  ) {
    if (mediaItem instanceof Show) {
      return mediaItem.seasons.loadCount(
        includeSpecials ? {} : { where: { isSpecial: false } },
      );
    }

    if (mediaItem instanceof Season) {
      return mediaItem.episodes.loadCount(
        includeSpecials ? {} : { where: { isSpecial: false } },
      );
    }

    return 0;
  }

  @FieldResolver(() => ID, { nullable: true })
  public async processorJobId(@Root() mediaItem: MediaItem) {
    const queue = queueRegistry.get("process-media-item");

    if (!queue) {
      return null;
    }

    const jobId = await queue.getDeduplicationJobId(
      `process-${mediaItem.type}-${mediaItem.id}`,
    );

    return jobId ?? null;
  }

  @FieldResolver(() => Date, { nullable: true })
  public async nextScrapeAttemptAt(@Root() mediaItem: MediaItem) {
    const { flow } = await import("#message-queue/flows/producer.ts");
    const processorJobId = await this.processorJobId(mediaItem);

    if (!processorJobId) {
      return null;
    }

    const processorFlow = await flow.getFlow({
      id: processorJobId,
      queueName: "process-media-item",
    });

    const scrapeJob = processorFlow.children?.find(
      ({ job }) => job.queueName === "scrape-item",
    );

    if (!scrapeJob) {
      return null;
    }

    const baseTimestamp = DateTime.fromMillis(
      scrapeJob.job.processedOn ?? scrapeJob.job.timestamp,
    );

    return baseTimestamp.plus({ milliseconds: scrapeJob.job.delay }).toJSDate();
  }
}
