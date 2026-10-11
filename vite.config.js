import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// COOP/COEP make the page cross-origin isolated so the threaded WASM backend
// (SharedArrayBuffer) is available. The generation path still forces
// numThreads=1 as a floor, but keeping the headers gives the fast path where
// the host allows it. Render sets these on the deployed site via its dashboard;
// these two blocks give dev + local-preview the same isolation.
const crossOriginIsolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  // relative base so the static build works regardless of the final deploy path
  base: "./",
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // precache the built shell; the painted backdrops and dares bank are the
      // assets the offline experience actually needs beyond the JS/CSS/HTML.
      includeAssets: [
        "icon.svg",
        "icon-180.png",
        "icon-192.png",
        "icon-512.png",
        "assets/backdrop-day.jpg",
        "assets/backdrop-night.jpg",
        "dares.json",
      ],
      manifest: false, // we ship our own public/manifest.json
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,json}"],
        // the Gemma model weights come from the HF CDN at runtime; cache them
        // so a second visit (and the offline demo) can still generate.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|huggingface\.co|.*\.hf\.co)\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "hf-model-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
