import { defineConfig } from 'vitest/config';
import path from 'path';

// Isolate test database so vitest never modifies production/dev data
process.env.DATABASE_URL = path.resolve(__dirname, './data/test.sqlite');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts', 'eval/**/*.test.ts', 'backend/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
