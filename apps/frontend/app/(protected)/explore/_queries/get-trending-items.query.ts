import { gql } from "@apollo/client";

import type {
  GetTrendingItemsQuery,
  GetTrendingItemsQueryVariables,
} from "./get-trending-items.query.typegen";
import type { TypedDocumentNode } from "@apollo/client";

export const GET_TRENDING_ITEMS: TypedDocumentNode<
  GetTrendingItemsQuery,
  GetTrendingItemsQueryVariables
> = gql`
  query GetTrendingItems($timeWindow: TMDBTrendingTimeWindow!) {
    tmdbTrendingMovies(timeWindow: $timeWindow) {
      id
      title
      posterUrl
      backdropUrl
      overview
      type
      year
      voteAverage
      mediaItem {
        id
        state
      }
    }
    tmdbTrendingShows(timeWindow: $timeWindow) {
      id
      title
      posterUrl
      backdropUrl
      overview
      type
      year
      voteAverage
      mediaItem {
        id
        state
      }
    }
  }
`;
