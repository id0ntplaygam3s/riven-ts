"use server";

import z from "zod";

import { getClient } from "#lib/graphql/client.ts";
import { permissionActionClient } from "#lib/server-actions/action-client.ts";

const RETRY_MEDIA_ITEM = `
  mutation RetryMediaItem($mediaItemId: ID!) {
    retryMediaItem(mediaItemId: $mediaItemId)
  }
`;

export const retryItems = permissionActionClient
  .inputSchema(z.array(z.string()))
  .action(async ({ parsedInput: itemIds }) => {
    let count = 0;
    const errors: string[] = [];

    for (const itemId of itemIds) {
      try {
        await getClient().mutate({
          mutation: RETRY_MEDIA_ITEM,
          variables: { mediaItemId: itemId },
          refetchQueries: ["GetLibraryItems"],
        });
        count++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Item ${itemId}: ${message}`);
      }
    }

    return { count, errors };
  });
