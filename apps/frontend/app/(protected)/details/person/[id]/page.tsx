import { Avatar, AvatarFallback, AvatarImage } from "#components/_ui/avatar.tsx";
import { Badge } from "#components/_ui/badge.tsx";
import { Button } from "#components/_ui/button.tsx";
import { Separator } from "#components/_ui/separator.tsx";
import { Skeleton } from "#components/_ui/skeleton.tsx";
import { SectionHeading } from "#components/media/section-heading/section-heading.tsx";
import { PortraitCard } from "#components/portrait-card/portrait-card.tsx";
import { GenericMediaCarousel } from "#components/media/generic-carousel.tsx";
import { fly } from "#components/_animations/fly.ts";
import { cn } from "cn";
import { ArrowUpRight, Film, Tv, Users } from "lucide-react";
import { notFound } from "next/navigation";

interface PersonDetailsData {
  id: string;
  name: string;
  profilePath: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string | null;
  biography: string | null;
  imdbId: string | null;
  alsoKnownAs: string[];
  castCredits: PersonCredit[];
  crewCredits: PersonCredit[];
}

interface PersonCredit {
  id: string;
  title: string;
  mediaType: "movie" | "tv";
  posterPath: string | null;
  backdropPath: string | null;
  character?: string | null;
  job?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
}

async function fetchPersonDetails(id: string): Promise<PersonDetailsData | null> {
  "use server";

  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    return null;
  }

  const [personRes, combinedCreditsRes] = await Promise.all([
    fetch(
      `https://api.themoviedb.org/3/person/${id}?api_key=${tmdbApiKey}&append_to_response=external_ids`
    ),
    fetch(
      `https://api.themoviedb.org/3/person/${id}/combined_credits?api_key=${tmdbApiKey}`
    ),
  ]);

  if (!personRes.ok || !combinedCreditsRes.ok) {
    return null;
  }

  const person = (await personRes.json()) as {
    id: number;
    name: string;
    profile_path: string | null;
    birthday: string | null;
    deathday: string | null;
    place_of_birth: string | null;
    known_for_department: string | null;
    biography: string | null;
    also_known_as: string[];
  };

  const credits = (await combinedCreditsRes.json()) as {
    cast: Array<{
      id: number;
      title?: string;
      name?: string;
      media_type: "movie" | "tv";
      poster_path: string | null;
      backdrop_path: string | null;
      character: string | null;
      release_date?: string | null;
      vote_average?: number | null;
    }>;
    crew: Array<{
      id: number;
      title?: string;
      name?: string;
      media_type: "movie" | "tv";
      poster_path: string | null;
      backdrop_path: string | null;
      job: string | null;
      release_date?: string | null;
      vote_average?: number | null;
    }>;
  };

  const imdbId = person.imdb_id ?? null;

  const castCredits: PersonCredit[] = credits.cast
    .filter((c) => c.poster_path)
    .map((c) => ({
      id: String(c.id),
      title: c.title ?? c.name ?? "Unknown",
      mediaType: c.media_type,
      posterPath: c.poster_path
        ? `https://image.tmdb.org/t/p/w500${c.poster_path}`
        : null,
      backdropPath: c.backdrop_path
        ? `https://image.tmdb.org/t/p/original${c.backdrop_path}`
        : null,
      character: c.character,
      releaseDate: c.release_date,
      voteAverage: c.vote_average,
    }));

  const crewCredits: PersonCredit[] = credits.crew
    .filter((c) => c.poster_path && c.job)
    .map((c) => ({
      id: String(c.id),
      title: c.title ?? c.name ?? "Unknown",
      mediaType: c.media_type,
      posterPath: c.poster_path
        ? `https://image.tmdb.org/t/p/w500${c.poster_path}`
        : null,
      backdropPath: c.backdrop_path
        ? `https://image.tmdb.org/t/p/original${c.backdrop_path}`
        : null,
      job: c.job,
      releaseDate: c.release_date,
      voteAverage: c.vote_average,
    }));

  return {
    id: String(person.id),
    name: person.name,
    profilePath: person.profile_path
      ? `https://image.tmdb.org/t/p/original${person.profile_path}`
      : null,
    birthday: person.birthday,
    deathday: person.deathday,
    placeOfBirth: person.place_of_birth,
    knownForDepartment: person.known_for_department,
    biography: person.biography,
    imdbId,
    alsoKnownAs: person.also_known_as ?? [],
    castCredits,
    crewCredits,
  };
}

function calculateAge(birthday: string, deathday?: string | null): number | null {
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function PersonDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await fetchPersonDetails(id);

  if (!person) {
    notFound();
  }

  const age = person.birthday ? calculateAge(person.birthday, person.deathday) : null;
  const birthdayToday = person.birthday
    ? (() => {
        const b = new Date(person.birthday);
        const now = new Date();
        return b.getMonth() === now.getMonth() && b.getDate() === now.getDate();
      })()
    : false;

  const topCredits = [
    ...person.castCredits.slice(0, 5),
    ...person.crewCredits.slice(0, 2),
  ].sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0));

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      {/* Background */}
      {person.profilePath && (
        <div className="fixed inset-0 z-0">
          <div
            className="h-full w-full bg-cover bg-center opacity-10 blur-3xl"
            style={{ backgroundImage: `url(${person.profilePath})` }}
          />
          <div className="absolute inset-0 bg-background/50" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-600 flex-col">
        {/* Hero section */}
        <div className="px-6 pb-12 md:px-12 md:pb-16 lg:px-16">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr] lg:gap-10">
            {/* Portrait */}
            <div
              className={cn("delay-50 animation-duration-400", fly)}
            >
              <Avatar className="group w-48 rounded-xl shadow-2xl ring-1 ring-white/10 transition-transform duration-500 hover:scale-105 lg:w-64">
                <AvatarImage
                  src={person.profilePath ?? undefined}
                  alt={person.name}
                />
                <AvatarFallback className="text-2xl">
                  {person.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {birthdayToday && !person.deathday && (
                <div className="bg-primary absolute -top-3 -right-3 z-20 rounded-full p-2 text-xl shadow-lg">
                  🎂
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
                {person.name}
              </h1>

              {/* Metadata badges */}
              <div className="flex flex-wrap items-center gap-2">
                {person.knownForDepartment && (
                  <Badge variant="outline" className="border-border/50 bg-muted/50 px-3 py-1 text-xs font-mono">
                    {person.knownForDepartment}
                  </Badge>
                )}
                {person.birthday && (
                  <Badge variant="outline" className="border-border/50 bg-muted/50 px-3 py-1 text-xs font-mono">
                    {formatDate(person.birthday)}
                    {!person.deathday && age !== null && (
                      <span className="ml-1 text-muted-foreground">• {age} y/o</span>
                    )}
                  </Badge>
                )}
                {person.placeOfBirth && (
                  <Badge variant="outline" className="border-border/50 bg-muted/50 px-3 py-1 text-xs font-mono">
                    {person.placeOfBirth}
                  </Badge>
                )}
              </div>

              {/* Also known as */}
              {person.alsoKnownAs.length > 0 && (
                <div className="delay-200 animation-duration-400" style={{ ...fly }}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Also known as
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {person.alsoKnownAs.slice(0, 8).map((alias) => (
                      <Badge
                        key={alias}
                        variant="secondary"
                        className="bg-muted/50 text-muted-foreground px-2 py-0.5 text-xs"
                      >
                        {alias}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* External links */}
              <div className="flex items-center gap-3 delay-250 animation-duration-400">
                {person.imdbId && (
                  <a
                    href={`https://www.imdb.com/name/${person.imdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
                  >
                    <ArrowUpRight size={14} />
                    IMDb
                  </a>
                )}
                <a
                  href={`https://www.themoviedb.org/person/${person.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
                >
                  <ArrowUpRight size={14} />
                  TMDB
                </a>
              </div>

              {/* Biography */}
              {person.biography && (
                <div
                  className={cn(
                    "text-muted-foreground max-w-4xl text-base leading-relaxed delay-350 animation-duration-400",
                    fly
                  )}
                >
                  <p className="line-clamp-4">{person.biography}</p>
                  {person.biography.length > 400 && person.imdbId && (
                    <a
                      href={`https://www.imdb.com/name/${person.imdbId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      Read more on IMDb
                      <ArrowUpRight size={12} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="mx-6 md:mx-12 lg:mx-16" />

        {/* Credits */}
        <div className="mx-6 mt-8 flex flex-col gap-12 md:mx-12 lg:mx-16">
          {person.castCredits.length > 0 && (
            <section>
              <SectionHeading title={
                <span className="inline-flex items-center gap-2">
                  <Film size={18} />
                  Acting Credits
                  <span className="text-muted-foreground font-mono text-sm">
                    ({person.castCredits.length})
                  </span>
                </span>
              } />
              <GenericMediaCarousel items={person.castCredits.slice(0, 20).map((c) => ({
                id: c.id,
                title: c.title,
                subtitle: c.character ?? undefined,
                image: c.posterPath,
                href: `/details/media/${c.mediaType}/${c.id}`,
              }))} />
            </section>
          )}

          {person.crewCredits.length > 0 && (
            <section>
              <SectionHeading title={
                <span className="inline-flex items-center gap-2">
                  <Users size={18} />
                  Crew Credits
                  <span className="text-muted-foreground font-mono text-sm">
                    ({person.crewCredits.length})
                  </span>
                </span>
              } />
              <GenericMediaCarousel items={person.crewCredits.slice(0, 20).map((c) => ({
                id: c.id,
                title: c.title,
                subtitle: c.job ?? undefined,
                image: c.posterPath,
                href: `/details/media/${c.mediaType}/${c.id}`,
              }))} />
            </section>
          )}
        </div>

        {/* Bottom padding */}
        <div className="h-24" />
      </div>
    </div>
  );
}
