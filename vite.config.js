import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app under /<repo>/; the Pages workflow sets BASE_PATH.
  // Local dev and plain builds stay at the root.
  base: process.env.BASE_PATH || '/',
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    vuetify({ autoImport: true }),
    // Installable app (mobile-first): add to the home screen, open full screen,
    // work offline. Updates install themselves on the next launch after a deploy.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'mindstream-icon.svg'],
      manifest: {
        name: 'Mindstream',
        short_name: 'Mindstream',
        description: 'A thinking workspace: turn big, unclear things into small actions you can take.',
        theme_color: '#1a1f2e',
        background_color: '#1a1f2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The icon font is large; let it be cached.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Deep links (a pad, a thread, a context) open the app offline too.
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    host: true, // listen on 0.0.0.0 so devices on your LAN can connect
    // 5273 instead of Vite's default 5173: on this machine other projects squat
    // [::1]:5173, so `localhost:5173` resolves to the wrong app. A unique port
    // keeps `localhost` pointed at Mindstream on both IPv4 and IPv6.
    // PORT env wins when a harness (e.g. preview tooling) assigns one.
    port: Number(process.env.PORT) || 5273,
  },
})
