import { SourceConfig } from "@repo/util-plugin-sdk/dto/entities";

import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";

import { CoreContext } from "#graphql/decorators/core-context.ts";

import type { ApolloServerContext } from "#graphql/context.ts";

/** Allowed source type string values. */
const ALLOWED_SOURCE_TYPES = ["tmdb", "tvdb", "custom", "debrid"] as const;
type AllowedSourceType = (typeof ALLOWED_SOURCE_TYPES)[number];

/** Validate that a string is a valid source type value. */
function assertValidSourceType(value: unknown): asserts value is AllowedSourceType {
  if (!(ALLOWED_SOURCE_TYPES as readonly string[]).includes(value as string)) {
    throw new Error(
      `Invalid source type: "${value}". Must be one of: ${ALLOWED_SOURCE_TYPES.join(", ")}`,
    );
  }
}

@ObjectType()
class SourceConfigCreateResponse {
  @Field(() => Boolean)
  public success!: boolean;

  @Field(() => SourceConfig, { nullable: true })
  public source?: SourceConfig | null;

  @Field(() => String, { nullable: true })
  public message?: string | null;
}

@Resolver(() => SourceConfig)
export class SourceConfigResolver {
  @Query(() => [SourceConfig], {
    description: "Get all source configurations.",
  })
  public async getSourceConfigs(
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
  ) {
    return sourceConfigService.getAllSourceConfigs();
  }

  @Query(() => [SourceConfig], {
    description: "Get only enabled source configurations.",
  })
  public async getEnabledSourceConfigs(
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
  ) {
    return sourceConfigService.getEnabledSourceConfigs();
  }

  @Query(() => [SourceConfig], {
    description: "Get source configurations filtered by type.",
  })
  public async getSourceConfigsByType(
    @Arg("type", () => String) type: string,
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
  ) {
    assertValidSourceType(type);
    return sourceConfigService.getSourceConfigsByType(type as AllowedSourceType);
  }

  @Mutation(() => SourceConfigCreateResponse, {
    description: "Create a new source configuration.",
  })
  public async createSourceConfig(
    @Arg("name", () => String) name: string,
    @Arg("type", () => String) type: string,
    @Arg("description", () => String, { nullable: true, defaultValue: null }) description: string | null,
    @Arg("apiKey", () => String, { nullable: true, defaultValue: null }) apiKey: string | null,
    @Arg("baseUrl", () => String, { nullable: true, defaultValue: null }) baseUrl: string | null,
    @Arg("priority", () => Number, { nullable: true, defaultValue: 0 }) priority: number,
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
    @Ctx() { logger }: ApolloServerContext,
  ) {
    try {
      assertValidSourceType(type);

      const source = await sourceConfigService.createSourceConfig({
        name,
        type: type as AllowedSourceType,
        description,
        apiKey,
        baseUrl,
        priority,
      });

      logger.info(`Created source configuration: ${source.name}`);

      return { success: true, source };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create source";
      logger.error(`Failed to create source configuration: ${message}`, { err: error });
      return { success: false, message };
    }
  }

  @Mutation(() => SourceConfig, {
    description: "Update an existing source configuration.",
  })
  public async updateSourceConfig(
    @Arg("id") id: string,
    @Arg("name", () => String, { nullable: true, defaultValue: undefined }) name: string | undefined,
    @Arg("type", () => String, { nullable: true, defaultValue: undefined }) type: string | undefined,
    @Arg("description", () => String, { nullable: true, defaultValue: undefined }) description: string | null | undefined,
    @Arg("apiKey", () => String, { nullable: true, defaultValue: undefined }) apiKey: string | null | undefined,
    @Arg("baseUrl", () => String, { nullable: true, defaultValue: undefined }) baseUrl: string | null | undefined,
    @Arg("priority", () => Number, { nullable: true, defaultValue: undefined }) priority: number | undefined,
    @Arg("enabled", () => Boolean, { nullable: true, defaultValue: undefined }) enabled: boolean | undefined,
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
    @Ctx() { logger }: ApolloServerContext,
  ) {
    if (type !== undefined) {
      assertValidSourceType(type);
    }

    // Build partial input, only including defined values
    const input: {
      name?: string;
      type?: AllowedSourceType;
      description?: string | null;
      apiKey?: string | null;
      baseUrl?: string | null;
      priority?: number;
      enabled?: boolean;
    } = {};

    if (name !== undefined) input.name = name;
    if (type !== undefined) input.type = type as AllowedSourceType;
    if (description !== undefined) input.description = description;
    if (apiKey !== undefined) input.apiKey = apiKey;
    if (baseUrl !== undefined) input.baseUrl = baseUrl;
    if (priority !== undefined) input.priority = priority;
    if (enabled !== undefined) input.enabled = enabled;

    const source = await sourceConfigService.updateSourceConfig(id, input);
    if (!source) {
      throw new Error(`Source configuration with ID ${id} not found`);
    }

    logger.info(`Updated source configuration: ${source.name}`);
    return source;
  }

  @Mutation(() => SourceConfigCreateResponse, {
    description: "Delete a source configuration.",
  })
  public async deleteSourceConfig(
    @Arg("id") id: string,
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
    @Ctx() { logger }: ApolloServerContext,
  ) {
    const deleted = await sourceConfigService.deleteSourceConfig(id);
    if (!deleted) {
      return { success: false, message: "Source configuration not found" };
    }

    logger.info(`Deleted source configuration: ${id}`);
    return { success: true, message: "Source deleted" };
  }

  @Mutation(() => SourceConfig, {
    description: "Toggle a source configuration's enabled status.",
  })
  public async toggleSourceConfigEnabled(
    @Arg("id") id: string,
    @CoreContext() { services: { sourceConfigService } }: CoreContext,
    @Ctx() { logger }: ApolloServerContext,
  ) {
    const source = await sourceConfigService.toggleSourceConfigEnabled(id);
    if (!source) {
      throw new Error(`Source configuration with ID ${id} not found`);
    }

    logger.info(`Toggled source configuration ${source.name}: ${source.enabled ? "enabled" : "disabled"}`);
    return source;
  }
}
