import { Badge } from "#components/_ui/badge.tsx";
import { Separator } from "#components/_ui/separator.tsx";
import { SectionHeading } from "#components/media/section-heading/section-heading.tsx";
import { GenericMediaCarousel } from "#components/media/generic-carousel.tsx";
import { fly } from "#components/_animations/fly.ts";
import { ArrowUpRight, Building2 } from "lucide-react";
import Image from "next/image";

interface CompanyDetailsData {
  id: string;
  name: string;
  logoPath: string | null;
  headquarters: string | null;
  homepage: string | null;
  originCountry: string | null;
  description: string | null;
  movies: CompanyCredit[];
  shows: CompanyCredit[];
}

interface CompanyCredit {
  id: string;
  title: string;
  mediaType: "movie" | "tv";
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
}

async function fetchCompanyDetails(id: string): Promise<CompanyDetailsData | null> {
  "use server";

  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    return null;
  }

  const [companyRes, moviesRes, showsRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/company/${id}?api_key=${tmdbApiKey}`),
    fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&with_companies=${id}&sort_by=popularity.desc`
    ),
    fetch(
      `https://api.themoviedb.org/3/discover/tv?api_key=${tmdbApiKey}&with_companies=${id}&sort_by=popularity.desc`
    ),
  ]);

  if (!companyRes.ok) {
    return null;
  }

  const company = (await companyRes.json()) as {
    id: number;
    name: string;
    logo_path: string | null;
    headquarters: string | null;
    homepage: string | null;
    origin_country: string;
    description: string | null;
  };

  const moviesData = await moviesRes.json();
  const showsData = await showsRes.json();

  const movies: CompanyCredit[] = (moviesData.results ?? [])
    .slice(0, 30)
    .map((item: any) => ({
      id: String(item.id),
      title: item.title ?? item.name ?? "Unknown",
      mediaType: "movie" as const,
      posterPath: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null,
      backdropPath: item.backdrop_path
        ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
        : null,
      releaseDate: item.release_date,
      voteAverage: item.vote_average,
    }));

  const shows: CompanyCredit[] = (showsData.results ?? [])
    .slice(0, 30)
    .map((item: any) => ({
      id: String(item.id),
      title: item.title ?? item.name ?? "Unknown",
      mediaType: "tv" as const,
      posterPath: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null,
      backdropPath: item.backdrop_path
        ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
        : null,
      releaseDate: item.first_air_date,
      voteAverage: item.vote_average,
    }));

  return {
    id: String(company.id),
    name: company.name,
    logoPath: company.logo_path
      ? `https://image.tmdb.org/t/p/original${company.logo_path}`
      : null,
    headquarters: company.headquarters,
    homepage: company.homepage,
    originCountry: company.origin_country,
    description: company.description,
    movies,
    shows,
  };
}

export default async function CompanyDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await fetchCompanyDetails(id);

  if (!company) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">Company not found</h2>
          <p className="mt-2 text-muted-foreground">
            This company&apos;s details are not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      {/* Background */}
      {company.logoPath && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src={company.logoPath}
              alt=""
              className="max-h-[60vh] max-w-[80%] object-contain opacity-5 blur-sm"
              width={400}
              height={200}
            />
          </div>
          <div className="absolute inset-0 bg-background/80" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-600 flex-col">
        <div className="px-6 pb-12 md:px-12 md:pb-16 lg:px-16">
          <div className="flex flex-col gap-6">
            {/* Logo */}
            <div className={cn("delay-50 animation-duration-400", fly)}>
              {company.logoPath ? (
                <div className="rounded-xl bg-muted/30 p-6 shadow-xl">
                  <Image
                    src={company.logoPath}
                    alt={company.name}
                    className="mx-auto max-h-24 w-auto object-contain"
                    width={300}
                    height={100}
                  />
                </div>
              ) : (
                <div className="flex h-24 w-full items-center justify-center rounded-xl bg-muted/30">
                  <Building2 className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col gap-4">
              <h1
                className={cn(
                  "text-foreground text-4xl font-black tracking-tight drop-shadow-md sm:text-5xl lg:text-6xl",
                  fly
                )}
              >
                {company.name}
              </h1>

              {/* Metadata badges */}
              <div className="flex flex-wrap items-center gap-2">
                {company.originCountry && (
                  <Badge variant="outline" className="border-border/50 bg-muted/50 px-3 py-1 text-xs font-mono">
                    {company.originCountry}
                  </Badge>
                )}
                {company.headquarters && (
                  <Badge variant="outline" className="border-border/50 bg-muted/50 px-3 py-1 text-xs font-mono">
                    {company.headquarters}
                  </Badge>
                )}
              </div>

              {/* External links */}
              <div className="flex items-center gap-3 delay-250 animation-duration-400">
                {company.homepage && (
                  <a
                    href={company.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
                  >
                    <ArrowUpRight size={14} />
                    Website
                  </a>
                )}
                <a
                  href={`https://www.themoviedb.org/company/${company.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
                >
                  <ArrowUpRight size={14} />
                  TMDB
                </a>
              </div>

              {/* Description */}
              {company.description && (
                <p
                  className={cn(
                    "text-muted-foreground max-w-4xl text-base leading-relaxed delay-350 animation-duration-400",
                    fly
                  )}
                >
                  {company.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator className="mx-6 md:mx-12 lg:mx-16" />

        {/* Films by Company */}
        <div className="mx-6 mt-8 flex flex-col gap-12 md:mx-12 lg:mx-16">
          {company.movies.length > 0 && (
            <section>
              <SectionHeading title={
                <span className="inline-flex items-center gap-2">
                  <Building2 size={18} />
                  Movies
                  <span className="text-muted-foreground font-mono text-sm">
                    ({company.movies.length})
                  </span>
                </span>
              } />
              <GenericMediaCarousel items={company.movies.map((m) => ({
                id: m.id,
                title: m.title,
                subtitle: m.releaseDate ? new Date(m.releaseDate).getFullYear().toString() : undefined,
                image: m.posterPath,
                href: `/details/media/movie/${m.id}`,
              }))} />
            </section>
          )}

          {company.shows.length > 0 && (
            <section>
              <SectionHeading title={
                <span className="inline-flex items-center gap-2">
                  <Building2 size={18} />
                  TV Shows
                  <span className="text-muted-foreground font-mono text-sm">
                    ({company.shows.length})
                  </span>
                </span>
              } />
              <GenericMediaCarousel items={company.shows.map((s) => ({
                id: s.id,
                title: s.title,
                subtitle: s.releaseDate ? new Date(s.releaseDate).getFullYear().toString() : undefined,
                image: s.posterPath,
                href: `/details/media/show/${s.id}`,
              }))} />
            </section>
          )}
        </div>

        <div className="h-24" />
      </div>
    </div>
  );
}
