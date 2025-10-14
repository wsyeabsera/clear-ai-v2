import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const GRAPHQL_HTTP = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql';
const GRAPHQL_WS = GRAPHQL_HTTP.replace('http://', 'ws://').replace('https://', 'wss://');

// HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: GRAPHQL_HTTP,
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS,
    retryAttempts: 5,
    shouldRetry: () => true,
    connectionParams: () => ({
      // Add any auth tokens here if needed
    }),
  })
);

// Split links: subscriptions use WebSocket, queries/mutations use HTTP
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});

