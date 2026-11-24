import { defineConfig } from 'vitest/config';

// Web: caminhos relativos, que servem tanto na raiz do domínio quanto numa subpasta.
// Apps (`vite build --mode app`): servidos na raiz do WebView do Capacitor, em dist-app/.
export default defineConfig(({ mode }) => {
  const app = mode === 'app';
  return {
    base: app ? '/' : './',
    define: { __NATIVE__: JSON.stringify(app) },
    build: {
      target: 'es2022',
      outDir: app ? 'dist-app' : 'dist',
      sourcemap: !app,
      chunkSizeWarningLimit: 2000,
    },
    server: { port: 5173 },
    preview: { port: 4173, strictPort: true },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
