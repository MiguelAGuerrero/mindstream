import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

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
