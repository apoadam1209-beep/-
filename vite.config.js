import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: { clientPort: 443, protocol: 'wss' },
  },
  preview: { host: true, port: 4173, allowedHosts: true },
  build: { target: 'es2019', outDir: 'dist', assetsInlineLimit: 0 },
});
