"use server";

import z from "zod";

import { getClient } from "#lib/graphql/client.ts";
import { permissionActionClient } from "#lib/server-actions/action-client.ts";
import { ItemPermission } from "@repo/util-auth/access-control";

export const removeItems = permissionActionClient
  .meta({
    permissions: {
      item: [ItemPermission.delete],
    },
  })
  .inputSchema(z.array(z.string()))
  .action(async ({ parsedInput: itemIds }) => {
    // We need to call the GraphQL mutation for each item
    // The removeMediaItem mutation is called via HTTP since it's not in the generated types
    const graphqlApiKey = process.env.GRAPHQL_API_KEY;
    const backendUrl = process.env.BACKEND_URL;

    if (!graphqlApiKey || !backendUrl) {
      throw new Error("GraphQL API key or backend URL not configured");
    }

    let count = 0;
    const errors: string[] = [];

    for (const itemId of itemIds) {
      try {
        const response = await fetch(`${backendUrl}/graphql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${graphqlApiKey}`,
          },
          body: JSON.stringify({
            query: `
              mutation RemoveMediaItem($mediaItemId: ID!) {
                removeMediaItem(mediaItemId: $mediaItemId)
              }
            `,
            variables: { mediaItemId: itemId },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData?.errors?.[0]?.message || `HTTP ${response.status}`,
          );
        }

        count++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Item ${itemId}: ${message}`);
      }
    }

    return { count, errors };
  });
