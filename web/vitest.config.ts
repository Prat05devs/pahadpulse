import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // tsconfig.json keeps JSX as-is for Next ("jsx": "preserve"); Vite 8's transformer follows
  // it, so the tests must ask for the automatic React runtime themselves.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.tsx',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
