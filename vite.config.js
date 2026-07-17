import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Preview/launch vositasi PORT env orqali bo'sh port tayinlaydi; uni hurmat
  // qilamiz (aks holda Vite 5173 band bo'lsa jimgina 5174'ga sirpanib ketadi
  // va proxy ulana olmaydi). PORT bo'lmasa odatdagi 5173.
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  build: {
    // ── Vendor chunk splitting ──
    // Avval barcha kutubxonalar bitta 1.18MB chunk'ga tushardi. Endi ular
    // alohida, kamdan-kam o'zgaradigan chunk'larga bo'linadi — brauzer ularni
    // bir marta keshlaydi va keyingi tashriflarda qayta yuklamaydi.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Firebase'ning ixtiyoriy/kechiktiriladigan qismlarini alohida chunk'ga ajratamiz:
          // messaging faqat push yoqilganda (Settings), storage faqat admin yuklashlarida kerak.
          // Shunda dastlabki 'firebase' (auth+firestore) chunk'i kichikroq bo'ladi.
          if (id.includes('@firebase/messaging') || id.includes('firebase/messaging')) return 'fb-messaging';
          if (id.includes('@firebase/storage') || id.includes('firebase/storage')) return 'fb-storage';
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
          if (id.includes('framer-motion') || id.includes('popmotion') || id.includes('motion-dom')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-router')) return 'router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'react-vendor';
          return 'vendor';
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],

      // ── Workbox: Offline caching strategiyalari ──
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Precache: Ilova qobig'i (JS/CSS/HTML/ikon/shrift) oldindan keshlanadi.
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}', 'pwa-*.png', 'apple-touch-icon.png', 'favicon.*'],
        // Savol RASMLARI (images/**, ~18MB) precache'dan CHIQARILDI — ular birinchi
        // ko'rilganda runtimeCaching (CacheFirst 'images-cache') orqali keshlanadi.
        // Shu bilan birinchi o'rnatishda ~20MB o'rniga ~2MB yuklanadi (mobil trafik tejaladi).
        globIgnores: ['**/images/**'],

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

        // ── Yangilanish oqimi: PROMPT rejimi ──
        // registerType:'prompt' bilan mos — yangi SW DARHOL faollashmaydi, "waiting"
        // holatida turadi. OfflineIndicator foydalanuvchiga "Yangilash" tugmasini
        // ko'rsatadi; bosilganda SKIP_WAITING xabari yuboriladi → SW faollashadi →
        // controllerchange → reload. Bu test/imtihon O'RTASIDA to'satdan majburiy
        // reload bo'lishining oldini oladi (avval skipWaiting:true buni keltirardi).
        skipWaiting: false,
        clientsClaim: true
      },

      manifest: {
        name: 'Zehin — Kasbiy Sertifikatlash',
        short_name: 'Zehin',
        description: "O'qituvchilar uchun kasbiy sertifikatlash va malaka attestatsiyasiga tayyorgarlik platformasi",
        lang: 'uz',
        dir: 'ltr',
        theme_color: '#F4F3EF',
        background_color: '#F4F3EF',
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
