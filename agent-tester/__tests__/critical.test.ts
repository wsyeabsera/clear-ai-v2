/**
 * Critical Scenarios - Jest Tests
 * 
 * Tests marked as 'critical' priority.
 * Essential functionality that must pass.
 */

import { createJestTests } from '../src/jest/adapter.js';
import * as path from 'path';

// Use __dirname provided by Jest (CommonJS compatible)
const scenariosDir = path.join(__dirname, '..', 'scenarios');

createJestTests({
  scenariosDir,
  priority: 'critical',
  endpoint: process.env.GRAPHQL_ENDPOINT,
  timeout: 60000,
});

