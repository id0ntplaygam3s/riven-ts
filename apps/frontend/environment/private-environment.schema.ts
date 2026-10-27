import { z } from "zod";

export const privateEnvironment = z
  .object({
    ORIGIN: z.url().prefault("https://localhost:9000"),
    BACKEND_URL: z.url().prefault("http://localhost:3000"),
    BACKEND_PUBLIC_WS_URL: z.string().prefault("ws://localhost:8080"),
    GRAPHQL_API_KEY: z.string().prefault(""),
  })
  .parse(process.env);
