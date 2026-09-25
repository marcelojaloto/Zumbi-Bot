import { defineConfig } from 'vitest/config';

// Base público para o GitHub Pages (https://<usuario>.github.io/Zumbi-Bot/).
export default defineConfig({
  base: '/Zumbi-Bot/',
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
  },
  server: { port: 5173 },
  preview: { port: 4173, strictPort: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
