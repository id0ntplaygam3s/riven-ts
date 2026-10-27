import { getClient } from "#lib/graphql/client.ts";

import { InfiniteItemGrid } from "../_components/infinite-item-grid/infinite-item-grid";
import { GET_SEARCH_RESULTS } from "./_queries/get-search-results.query";
import { GET_TRENDING_ITEMS } from "./_queries/get-trending-items.query";

import type { SearchParams } from "#app/_types/search-params.type";

interface ExplorePageProps {
  searchParams: Promise<SearchParams>;
}

interface TrendingItem {
  id: string | number;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  type: "movie" | "show";
  year: number | null;
  voteAverage: number | null;
  mediaItem?: { id: string; state: string } | null;
}

async function fetchTrendingItems() {
  const { data } = await getClient().query({
    query: GET_TRENDING_ITEMS,
    variables: { timeWindow: "day" },
  });

  if (!data) return { movies: [], shows: [], examples: [] as string[] };

  const movies: TrendingItem[] = (data.tmdbTrendingMovies ?? []).map((m) => ({
    ...m,
    type: "movie" as const,
  }));
  const shows: TrendingItem[] = (data.tmdbTrendingShows ?? []).map((s) => ({
    ...s,
    type: "show" as const,
  }));

  const allItems = [...movies, ...shows];
  // Sort by vote average and take top items
  const topItems = allItems
    .filter((i) => i.voteAverage !== null && i.voteAverage !== undefined)
    .sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))
    .slice(0, 10);

  // Generate search examples from titles
  const examples = topItems
    .slice(0, 12)
    .map((i) => i.title)
    .filter(Boolean);

  return { movies, shows, topItems, examples };
}

async function fetchSearchResults(searchQuery: string, page: number) {
  const { data } = await getClient().query({
    query: GET_SEARCH_RESULTS,
    variables: {
      query: searchQuery,
      page,
    },
  });

  if (!data) {
    throw new Error("Failed to load search results");
  }

  const items = new Map(
    data.search.results.map(({ plugin, item }) => [
      `${plugin}:${item.type}:${item.id}`,
      item,
    ]),
  );

  return { items, errors: data.search.errors };
}

async function fetchSearchResultsPage(searchQuery: string, page: number) {
  "use server";

  const { items } = await fetchSearchResults(searchQuery, page);

  return items;
}

/**
 * Explore route with hero section, feeling lucky, search suggestions,
 * and paged search results.
 */
export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { query: searchQuery } = await searchParams;

  const { topItems, examples } = await fetchTrendingItems();

  if (!searchQuery) {
    return (
      <div className="relative min-h-screen w-full overflow-x-hidden">
        {/* Background */}
        {topItems[0]?.backdropUrl && (
          <div className="fixed inset-0 z-0 h-screen w-full">
            <img
              alt=""
              className="h-full w-full object-cover opacity-30 blur-3xl"
              src={topItems[0].backdropUrl}
              loading="lazy"
            />
            <div className="bg-background/80 absolute inset-0 mix-blend-multiply" />
            <div className="to-background absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
          </div>
        )}

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-24 md:px-12 md:py-32 lg:px-16">
          {/* Hero Section */}
          {topItems[0] && (
            <div className="flex flex-col gap-6 md:gap-8">
              <div className="max-w-3xl space-y-4">
                {topItems[0].voteAverage && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-background/50 px-2.5 py-1 backdrop-blur-md">
                      <span className="font-black text-[#01b4e4]">TMDB</span>
                      <span className="text-sm font-bold text-white">
                        {(topItems[0].voteAverage as number).toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
                <h2 className="text-foreground text-4xl font-black tracking-tight drop-shadow-lg md:text-6xl lg:text-7xl">
                  {topItems[0].title}
                </h2>
                <p className="text-muted-foreground line-clamp-3 text-lg md:text-xl md:leading-relaxed">
                  {topItems[0].overview}
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href={`/details/media/${topItems[0].type}/${topItems[0].id}`}
                    className="inline-flex h-12 items-center rounded-xl border border-primary/50 bg-transparent px-6 font-bold text-primary shadow-xl backdrop-blur-md transition-all hover:bg-primary/10"
                  >
                    View Details
                  </a>
                  <button
                    onClick={() => {
                      const randomItem =
                        topItems[Math.floor(Math.random() * topItems.length)];
                      window.location.href = `/details/media/${randomItem.type}/${randomItem.id}`;
                    }}
                    className="inline-flex h-12 items-center rounded-xl border border-border/50 bg-transparent px-6 font-bold text-muted-foreground backdrop-blur-md transition-all hover:border-border/80 hover:bg-muted/10 hover:text-foreground"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2 h-5 w-5 text-primary transition-transform duration-500 group-hover:rotate-12"
                    >
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                      <path d="M5 3v4" />
                      <path d="M19 17v4" />
                      <path d="M3 5h4" />
                      <path d="M17 19h4" />
                    </svg>
                    Feeling Lucky
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search Suggestions */}
          {examples.length > 0 && (
            <div className="flex flex-col gap-6 pt-8">
              <h3 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
                Trending now
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      window.location.href = `/explore?query=${encodeURIComponent(example)}`;
                    }}
                    className="flex items-center gap-3 rounded-xl border border-transparent bg-card/50 p-3 text-left text-sm font-medium text-foreground transition-all duration-500 hover:border-border/50 hover:bg-accent/50 hover:scale-[1.02] md:gap-4 md:p-5 md:text-lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-300 md:h-5 md:w-5"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (typeof searchQuery !== "string") {
    throw new TypeError("Invalid search query");
  }

  const { items, errors } = await fetchSearchResults(searchQuery, 1);

  return (
    <>
      {errors.length > 0 && (
        <p className="text-muted-foreground col-span-full text-sm">
          Some sources could not be searched:{" "}
          {errors
            .map(({ plugin, message }) => `${plugin} (${message})`)
            .join(", ")}
        </p>
      )}
      <InfiniteItemGrid
        key={searchQuery}
        fetchPage={fetchSearchResultsPage.bind(null, searchQuery)}
        initialData={items}
        noItemsFoundMessage={`No items found matching "${searchQuery}"`}
      />
    </>
  );
}
