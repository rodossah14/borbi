import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Bor-Bi Tech',
        short_name: 'Bor-Bi',
        description: 'Place de marché panafricaine universelle',
        theme_color: '#0b1326',
        background_color: '#0b1326',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'fr',
        start_url: '/',
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Cache offline minimal — sera étoffé à l'Étape 4 (PWA full)
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
