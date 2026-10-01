import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  window.localStorage.clear();
});
