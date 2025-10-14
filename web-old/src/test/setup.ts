import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

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

