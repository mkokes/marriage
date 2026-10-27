import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered from src/serviceWorker.ts, which reloads the page on updates.
      injectRegister: false,
      // A new version takes over as soon as it's installed (instead of waiting for
      // every tab to close); src/serviceWorker.ts then reloads the page onto it.
      workbox: { skipWaiting: true, clientsClaim: true },
      manifest: {
        name: 'Marriage',
        short_name: 'Marriage',
        description: 'Play the Nepali card game Marriage with friends.',
        theme_color: '#141e46',
        background_color: '#141e46',
        display: 'standalone',
        orientation: 'any',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  // Forward PartyKit-style routes to `wrangler dev` so the client can use a same-origin host.
  server: {
    proxy: { '/parties': { target: 'http://localhost:8787', ws: true } },
  },
  preview: {
    proxy: { '/parties': { target: 'http://localhost:8787', ws: true } },
  },
});
