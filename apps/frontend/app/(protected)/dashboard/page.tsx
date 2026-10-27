import { getClient } from "#lib/graphql/client.ts";

import { PortraitCard } from "#components/portrait-card/portrait-card.tsx";

async function getStats() {
  if (process.env.NODE_ENV === "production" && !process.env.BACKEND_URL) {
    return { totalCount: 0, recentlyAdded: [] };
  }

  try {
    const { data } = await getClient().query({
      query: `
        query GetStats {
          mediaItemsCount(type: [movie, show, season, episode])
          recentlyAdded {
            ... on Movie {
              id
              title
              posterPath
              tmdbId
              year
              state
            }
            ... on Show {
              id
              title
              posterPath
              tvdbId
              year
              state
            }
            ... on Season {
              id
              title
              posterPath
              year
              state
            }
            ... on Episode {
              id
              title
              posterPath
              state
            }
          }
        }
      `,
    });

    if (!data) return { totalCount: 0, recentlyAdded: [] };

    return {
      totalCount: data.mediaItemsCount,
      recentlyAdded: data.recentlyAdded ?? [],
    };
  } catch {
    return { totalCount: 0, recentlyAdded: [] };
  }
}

export default async function DashboardPage() {
  const { totalCount, recentlyAdded } = await getStats();

  // Count by state
  const stateCounts: Record<string, number> = {};
  recentlyAdded.forEach((item: any) => {
    const state = item.mediaItem?.state ?? "unknown";
    stateCounts[state] = (stateCounts[state] ?? 0) + 1;
  });

  const completedCount = stateCounts["Completed"] ?? 0;
  const incompleteCount = totalCount - completedCount;
  const completionRate =
    totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : "0";

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black" />
        <div className="bg-primary/5 absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full blur-[120px]" />
        <div className="absolute right-[-5%] bottom-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-24 md:px-12 md:py-16 lg:px-16">
        {/* Header */}
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Media library overview and statistics
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-muted-foreground text-sm font-medium">Total Items</p>
            <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
              {totalCount.toLocaleString()}
            </p>
            <p className="text-muted-foreground text-xs">All indexed items</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-muted-foreground text-sm font-medium">Completed</p>
            <p className="text-muted-foreground mt-1 text-2xl font-semibold tabular-nums">
              {completedCount.toLocaleString()}
            </p>
            <p className="text-muted-foreground text-xs">Fully processed</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-muted-foreground text-sm font-medium">Incomplete</p>
            <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums text-amber-400">
              {incompleteCount.toLocaleString()}
            </p>
            <p className="text-muted-foreground text-xs">Pending processing</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-muted-foreground text-sm font-medium">Completion Rate</p>
            <p className="text-muted-foreground mt-1 text-2xl font-semibold tabular-nums">
              {completionRate}%
            </p>
            <p className="text-muted-foreground text-xs">Completed / Total</p>
          </div>
        </div>

        {/* Recently Added */}
        <div>
          <h2 className="text-foreground mb-4 text-xl font-bold tracking-tight">
            Recently Added
          </h2>
          {recentlyAdded.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {recentlyAdded.map((item: any) => {
                const mediaType = item.__typename?.toLowerCase() as "movie" | "show" | "season" | "episode";
                const detailId = item.tmdbId || item.tvdbId || item.id;
                const poster = item.posterPath;
                const title = item.title || `Season ${item.seasonNumber || ""}`;
                
                return (
                  <a
                    key={item.id}
                    href={`/details/media/${mediaType}/${detailId}`}
                    className="group aspect-[2/3] w-full overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                  >
                    <PortraitCard
                      title={title}
                      image={poster}
                      className="w-full"
                    />
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center">
              No recently added items.
            </p>
          )}
        </div>

        {/* Service Status */}
        <div>
          <h2 className="text-foreground mb-4 text-xl font-bold tracking-tight">
            Service Status
          </h2>
          <div className="flex flex-wrap gap-3">
            <ServiceBadge label="TMDB" isValid={true} />
            <ServiceBadge label="TVDB" isValid={true} />
            <ServiceBadge label="Plex" isValid={true} />
            <ServiceBadge label="Comet" isValid={true} />
            <ServiceBadge label="StremThru" isValid={true} />
            <ServiceBadge label="Torrentio" isValid={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceBadge({ label, isValid }: { label: string; isValid: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-medium ${
        isValid
          ? "bg-green-600/20 text-green-400"
          : "bg-red-600/20 text-red-400"
      }`}
    >
      {label}
    </span>
  );
}
