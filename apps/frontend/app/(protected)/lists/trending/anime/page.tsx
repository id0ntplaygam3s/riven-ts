import { TrendingDiscoveryPage } from "#app/(protected)/lists/trending/_components/trending-discovery-page/trending-discovery-page.tsx";
import { GenericMediaCarousel } from "#components/media/generic-carousel.tsx";
import { MediaCarousel } from "#app/(protected)/details/media/[type]/[id]/_components/media-carousel";
import { Badge } from "#components/_ui/badge.tsx";
import { AlertTriangle } from "lucide-react";

interface AnilistEdge {
  node: {
    id: number;
    title: {
      romaji: string;
      english: string | null;
      native: string;
    };
    coverImage: {
      large: string;
      color: string;
    };
    format: string;
    episodes: number | null;
    status: string;
    averageScore: number | null;
    genres: string[];
    startDate: {
      year: number | null;
      month: number | null;
      day: number | null;
    };
  };
}

interface AnilistTrendingResponse {
  Page: {
    media: AnilistEdge["node"][];
  };
}

async function fetchAnilistTrending(page: number): Promise<AnilistEdge["node"][]> {
  "use server";

  const variables = {
    sort: ["TRENDING_DESC"],
    type: "ANIME",
    page: page,
    perPage: 20,
    season: undefined as string | undefined,
    seasonYear: undefined as number | undefined,
  };

  const query = `
    query ($sort: [MediaSort], $type: MediaType, $page: Int, $perPage: Int, $season: Season, $seasonYear: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: $sort, type: $type, season: $season, seasonYear: $seasonYear) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            color
          }
          format
          episodes
          status
          averageScore
          genres
          startDate {
            year
            month
            day
          }
        }
      }
    }
  `;

  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as AnilistTrendingResponse;
  return data.Page.media ?? [];
}

function formatYear(startDate: AnilistEdge["node"]["startDate"]): string | null {
  return startDate.year?.toString() ?? null;
}

export default async function AnimeTrendingPage() {
  const trending = await fetchAnilistTrending(1);

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-600 flex-col gap-6 px-6 pt-6 pb-24 md:px-12 md:pt-16 md:pb-12 lg:px-16">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-foreground text-3xl font-black tracking-tight drop-shadow-md sm:text-4xl lg:text-5xl">
              Trending Anime
            </h1>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-3 py-1 text-xs font-mono">
              AniList
            </Badge>
          </div>
        </div>
      </div>

      {trending.length > 0 ? (
        <GenericMediaCarousel items={trending.map((anime) => ({
          id: String(anime.id),
          title: anime.title.english ?? anime.title.romaji,
          subtitle: [anime.genres.slice(0, 2).join(", "), formatYear(anime.startDate)].filter(Boolean).join(" • "),
          image: anime.coverImage.large,
          href: `https://anilist.co/anime/${anime.id}`,
        }))} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/20 py-16 text-center">
          <AlertTriangle className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">Anime trending coming soon</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            AniList integration is being added to the backend.
          </p>
        </div>
      )}
    </div>
  );
}
