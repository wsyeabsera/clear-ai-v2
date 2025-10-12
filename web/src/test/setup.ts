import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    VITE_GRAPHQL_ENDPOINT: 'http://localhost:3001/graphql',
    DEV: true,
  },
});

