/**
 * Agent System Integration Tests (via Jest)
 * 
 * These tests run all agent test scenarios through Jest.
 * They require a running GraphQL server at GRAPHQL_ENDPOINT.
 * 
 * Usage:
 *   yarn test:agent
 *   GRAPHQL_ENDPOINT=http://localhost:4001/graphql yarn test:agent
 */

import { createJestTests } from '../src/jest/adapter.js';
import * as path from 'path';

// Use __dirname provided by Jest (CommonJS compatible)
const scenariosDir = path.join(__dirname, '..', 'scenarios');

createJestTests({
  scenariosDir,
  endpoint: process.env.GRAPHQL_ENDPOINT,
  timeout: 60000,
});

