/**
 * Simple Scenarios - Jest Tests
 * 
 * Quick smoke tests for basic functionality.
 * Should complete in < 5 minutes.
 */

import { createJestTestsForCategory } from '../src/jest/adapter.js';
import * as path from 'path';

// Use __dirname provided by Jest (CommonJS compatible)
const scenariosDir = path.join(__dirname, '..', 'scenarios');

createJestTestsForCategory(scenariosDir, 'simple', 30000);

