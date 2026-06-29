import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

// Used by `npm run electron:dev` / `npm run electron:build`.
// Plain `npm run dev` still runs the web-only renderer (Layer 1 testing).
export default defineConfig(async () => ({
  plugins: [
    react(),
    ...(await electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              // Keep native / ESM-only modules external — resolved at runtime.
              external: ['get-windows', 'electron'],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            rollupOptions: { external: ['electron'] },
          },
        },
      },
    })),
  ],
  server: { port: 5173 },
}));
