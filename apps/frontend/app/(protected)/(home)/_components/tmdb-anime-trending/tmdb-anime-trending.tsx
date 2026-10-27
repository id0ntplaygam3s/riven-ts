import { GenericMediaCarousel } from "#components/media/generic-carousel.tsx";
import { SectionHeading } from "#components/media/section-heading/section-heading.tsx";
import { cn } from "cn";
import { fly } from "#components/_animations/fly.ts";

interface AnilistEdge {
  node: {
    id: number;
    title: {
      romaji: string;
      english: string | null;
    };
    coverImage: {
      large: string;
      color: string;
    };
    format: string;
    averageScore: number | null;
    genres: string[];
    startDate: {
      year: number | null;
    };
  };
}

async function fetchAnilistTrending(): Promise<AnilistEdge["node"][]> {
  "use server";

  const query = `
    query {
      Page(perPage: 12) {
        media(sort: TRENDING_DESC, type: ANIME) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            color
          }
          format
          averageScore
          genres
          startDate {
            year
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query }),
      cache: "force-cache",
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      Page: { media: AnilistEdge["node"][] };
    };
    return data.Page.media ?? [];
  } catch {
    return [];
  }
}

export async function TMDBAnimeTrending() {
  const trending = await fetchAnilistTrending();

  if (trending.length === 0) {
    return null;
  }

  return (
    <div className={cn("delay-250 fill-mode-backwards", fly)}>
      <SectionHeading title={
        <span className="inline-flex items-center gap-2">
          Trending Anime
          <span className="text-purple-400 text-xs font-mono">AniList</span>
        </span>
      } />
      <GenericMediaCarousel items={trending.map((anime) => ({
        id: String(anime.id),
        title: anime.title.english ?? anime.title.romaji,
        subtitle: [anime.genres.slice(0, 2).join(", "), anime.startDate.year?.toString()].filter(Boolean).join(" • "),
        image: anime.coverImage.large,
        href: `https://anilist.co/anime/${anime.id}`,
      }))} />
    </div>
  );
}
