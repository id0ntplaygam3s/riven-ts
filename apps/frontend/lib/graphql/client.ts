import {
  ApolloClient,
  InMemoryCache,
  split,
  type ApolloClient as ApolloClientType,
} from "@apollo/client";
import { HttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

import { privateEnvironment } from "#environment/private-environment.schema.ts";

function createApolloClient(): ApolloClientType {
  const baseUrl = privateEnvironment.BACKEND_URL;
  const wsUrl = baseUrl
    .replace("http://", "ws://")
    .replace("https://", "wss://");
  const apiKey = privateEnvironment.GRAPHQL_API_KEY;

  // SSR (Node.js) needs absolute Docker-internal URL; browser uses relative proxy route
  const isBrowser = typeof window !== "undefined";
  const httpUri = isBrowser ? "/api/graphql" : `${baseUrl}/graphql`;

  const httpLink = new HttpLink({
    uri: httpUri,
  });

  // Add auth header to HTTP requests
  const authLink = setContext((_, { headers }) => ({
    headers: {
      ...headers,
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  }));

  // WebSocket: browser connects directly to backend's public port
  // SSR uses Docker internal URL (server-to-server)
  let wsEndpoint: string;
  if (isBrowser) {
    // Backend public WebSocket URL: ws://<public-host>:<backend-host-port>/graphql
    // e.g., ws://dulkoan-server.tailc37119.ts.net:8080/graphql
    const backendPublicUrl =
      privateEnvironment.BACKEND_PUBLIC_WS_URL || "ws://localhost:8080";
    wsEndpoint = `${backendPublicUrl}/graphql`;
  } else {
    wsEndpoint = `${wsUrl}/graphql`;
  }

  const wsLink = new GraphQLWsLink(
    createClient({
      url: wsEndpoint,
      connectionParams: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      on: {
        error: (err) => {
          console.error("GraphQL WebSocket error:", err);
        },
      },
    }),
  );

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      );
    },
    wsLink,
    authLink.concat(httpLink),
  );

  return new ApolloClient({
    cache: new InMemoryCache({
      possibleTypes: {
        MediaItem: ["Movie", "Show", "Season", "Episode"],
        ShowLikeMediaItem: ["Show", "Season", "Episode"],
      },
      typePolicies: {
        TmdbIndexerData: {
          keyFields: ["type", "id"],
        },
      },
    }),
    link: splitLink,
  });
}

// Simple client singleton for SSR/SSG
let clientInstance: ApolloClientType | null = null;

export function getClient(): ApolloClientType {
  if (!clientInstance) {
    clientInstance = createApolloClient();
  }
  return clientInstance;
}

export async function query<T>(
  options: Parameters<ApolloClientType["query"]>[0],
): Promise<Awaited<ReturnType<ApolloClientType["query"]>>> {
  return getClient().query(options);
}

// PreloadQuery is not available without registerApolloClient
// For RSC data fetching, use getClient().query() directly in server components
export const PreloadQuery = null as any;
