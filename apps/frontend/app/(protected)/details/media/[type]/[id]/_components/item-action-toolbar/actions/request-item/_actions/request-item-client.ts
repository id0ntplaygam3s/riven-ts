import { getClient } from "#lib/graphql/client.ts";

import { GET_MEDIA_ITEM } from "../../../../../_queries/get-media-item.query.ts";
import { REQUEST_ITEM } from "../_mutations/request-item.mutation.ts";

import type { ExternalIds } from "./_schemas/external-ids.schema";
import type { RequestedSeasons } from "./_schemas/request-show.form-schema";

/**
 * Client-side request mutation with Apollo cache refetch.
 * This updates the Apollo cache with the new isRequested state
 * so the UI reflects the change immediately.
 */
export async function requestItemClient(
  externalIds: ExternalIds,
  requestedSeasons?: RequestedSeasons,
): Promise<{ success: boolean }> {
  try {
    const type = requestedSeasons ? "Show" : "Movie";
    const itemId = externalIds.tmdbId || "0";

    const { data } = await getClient().mutate({
      mutation: REQUEST_ITEM,
      variables: {
        input: {
          ...(externalIds.tmdbId && { tmdbId: externalIds.tmdbId }),
          ...(externalIds.tvdbId && { tvdbId: externalIds.tvdbId }),
          ...(externalIds.imdbId && { imdbId: externalIds.imdbId }),
          requestedBy: "", // Backend doesn't validate; just passed to state machine
          ...(requestedSeasons
            ? {
                requestedSeasons: Object.keys(requestedSeasons).map(Number),
                type: "show",
              }
            : { type: "movie" }),
        },
      },
      // Refetch the media item to update Apollo cache with new isRequested state
      refetchQueries: [
        {
          query: GET_MEDIA_ITEM,
          variables: { id: itemId, type: type as any },
        },
      ],
    });

    return { success: data?.requestItem ?? false };
  } catch (error) {
    console.error("Request item failed:", error);
    return { success: false };
  }
}
