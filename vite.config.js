import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],

      // ── Workbox: Offline caching strategiyalari ──
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Precache: Barcha build fayllarini oldindan keshlash
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // Runtime caching: Firestore va boshqa API so'rovlari uchun
        runtimeCaching: [
          {
            // Google Fonts — Cache First (bir marta yuklab, keyin keshdan)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 yil
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Google Fonts fayllar (woff2) — Cache First
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Firebase Auth — Network First (har doim yangi token kerak)
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-auth-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 }, // 1 soat
              networkTimeoutSeconds: 10
            }
          },
          {
            // Firebase Firestore — Stale While Revalidate
            // Avval keshdan ko'rsatadi, keyin yangilaydi
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'firestore-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 1 kun
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Rasmlar (savollar uchun) — Cache First
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 kun
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ],

        // Offline fallback
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],

        // SW hajmini optimallashtirish
        skipWaiting: true,
        clientsClaim: true
      },

      manifest: {
        name: 'IQRO Kasbiy Sertifikatlash',
        short_name: 'IQRO Test',
        description: 'Chaqiruvga qadar boshlangʻich tayyorgarlik fanidan kasbiy sertifikatlash platformasi',
        theme_color: '#007AFF',
        background_color: '#F2F2F7',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
