/**
 * Source type enum for dynamic source configuration.
 * Uses const object + type for TS7 erasableSyntaxOnly compatibility.
 */
export const SourceType = {
  TMDB: "tmdb",
  TVDB: "tvdb",
  CUSTOM: "custom",
  DEBRID: "debrid",
} as const;

export type SourceType = (typeof SourceType)[keyof typeof SourceType];
