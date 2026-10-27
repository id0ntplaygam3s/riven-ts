import { ApolloClient, InMemoryCache, split, type ApolloClient as ApolloClientType } from "@apollo/client";
import { HttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import {
  registerApolloClient,
  InMemoryCache as NextInMemoryCache,
} from "@apollo/client-integration-nextjs";

import { privateEnvironment } from "#environment/private-environment.schema.ts";

function createApolloClient(): ApolloClientType {
  const baseUrl = privateEnvironment.BACKEND_URL;
  const wsUrl = baseUrl.replace("http://", "ws://").replace("https://", "wss://");
  const apiKey = privateEnvironment.GRAPHQL_API_KEY;

  const httpLink = new HttpLink({
    uri: `${baseUrl}/graphql`,
  });

  // Add auth header to HTTP requests
  const authLink = setContext((_, { headers }) => ({
    headers: {
      ...headers,
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  }));

  const wsLink = new GraphQLWsLink(
    createClient({
      url: `${wsUrl}/graphql`,
      connectionParams: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
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
    cache: new NextInMemoryCache({
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

export const { getClient, query, PreloadQuery } = registerApolloClient(
  createApolloClient,
);
