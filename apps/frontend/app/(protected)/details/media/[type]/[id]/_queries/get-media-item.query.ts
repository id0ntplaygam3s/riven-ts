import { gql } from "@apollo/client";

import type {
  GetMediaItemQuery,
  GetMediaItemQueryVariables,
} from "./get-media-item.query.typegen.ts";
import type { TypedDocumentNode } from "@apollo/client";

export const GET_MEDIA_ITEM: TypedDocumentNode<
  GetMediaItemQuery,
  GetMediaItemQueryVariables
> = gql`
  query GetMediaItem($id: ID!, $type: TopLevelMediaItemType!) {
    tmdbItem(id: $id, type: $type) {
      id
      type
      backdropUrl
      logo(width: 750) {
        aspectRatio
        url
        height
        width
      }
      trailer {
        id
        name
        site
        key
        url
      }
      title
      posterUrl
      overview
      genres {
        id
        name
      }
      year
      runtime
      language
      certification
      status
      originCountry
      productionCompanies {
        id
        name
        logoPath
        originCountry
      }
      revenue
      budget
      imdbId
      isRequestable
      ratings {
        imdb {
          logo
          url
          score
        }
        tmdb {
          logo
          url
          score
        }
        metacritic {
          logo
          url
          score
        }
        rottenTomatoes {
          logo
          url
          score
        }
        trakt {
          logo
          url
          score
        }
      }
      mediaItem {
        ... on MediaItem {
          id
          isRequested
          state
        }
      }
      # filesystemEntries {
      #   id
      #   fileSize {
      #     size
      #     units
      #   }
      #   createdAt
      #   type
      #   originalFilename
      #   plugin
      # }
      # mediaMetadata {
      #   subtitleTracks {
      #     language
      #   }
      #   qualitySource
      #   isRemux
      #   isProper
      #   isRepack
      #   bitRate
      #   duration
      #   containerFormat
      #   audioTracks {
      #     channels
      #     codec
      #   }
      #   fileName
      #   video {
      #     resolution {
      #       width
      #       height
      #       codec
      #       bitDepth
      #       hdrType
      #       frameRate
      #     }
      #   }
      # }
    }
  }
`;
