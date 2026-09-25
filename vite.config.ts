import { defineConfig } from 'vitest/config';

// Web: base público do GitHub Pages (https://<usuario>.github.io/Zumbi-Bot/).
// App Android (`vite build --mode app`): servido na raiz do WebView do Capacitor, em dist-app/.
export default defineConfig(({ mode }) => {
  const app = mode === 'app';
  return {
    base: app ? '/' : '/Zumbi-Bot/',
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
