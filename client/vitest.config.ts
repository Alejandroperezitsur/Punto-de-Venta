import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['./tests/**/*.{test,spec,chaos}.{ts,tsx}'],
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['verbose'],
  },
});
