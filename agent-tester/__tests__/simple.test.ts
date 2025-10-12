/**
 * Simple Scenarios - Jest Tests
 * 
 * Quick smoke tests for basic functionality.
 * Should complete in < 5 minutes.
 */

import { createJestTestsForCategory } from '../src/jest/adapter.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scenariosDir = path.join(__dirname, '..', 'scenarios');

createJestTestsForCategory(scenariosDir, 'simple', 30000);

