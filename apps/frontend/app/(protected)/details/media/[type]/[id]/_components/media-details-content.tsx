import { SingleMediaItem } from "../../../_components/single-media-item.tsx";
import { ItemCast } from "./item-cast/item-cast.tsx";
import { ItemMetadata } from "./item-metadata.tsx";
import { ItemRecommendations } from "./item-recommendations/item-recommendations.tsx";
import { ItemSeasons } from "./item-seasons/item-seasons.tsx";
import { SimilarItems } from "./similar-items/similar-items.tsx";
import { VideoPlayerDialog } from "./video-player-dialog.tsx";

import type { ComponentProps } from "react";

interface MediaDetailsContentProps {
  data: ComponentProps<typeof SingleMediaItem>["indexerData"];
}

/**
 * Server Component: renders all media details UI including the video player dialog.
 */
export function MediaDetailsContent({ data }: MediaDetailsContentProps) {
  const hasStream = data.mediaItem?.state === "Completed";

  return (
    <>
      <SingleMediaItem
        indexerData={data}
        hasStream={hasStream}
        onPlay={hasStream ? () => {} : undefined}
        slots={{
          seasonList: data.type === "show" && <ItemSeasons id={data.id} />,
          castList: <ItemCast id={data.id} type={data.type} />,
          itemMetadata: <ItemMetadata data={data} />,
          itemRecommendations: (
            <ItemRecommendations id={data.id} type={data.type} />
          ),
          similarItems: <SimilarItems id={data.id} type={data.type} />,
        }}
      />

      {hasStream && data.mediaItem && (
        <VideoPlayerDialog itemId={data.mediaItem.id} />
      )}
    </>
  );
}
