import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // PWA/SPA — no server-side rendering. IndexedDB, canvas, and camera APIs
  // are browser-only. SSR would crash on all of them.
  ssr: false,

  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@primevue/nuxt-module',
    '@vite-pwa/nuxt',
    '@vueuse/nuxt',
  ],

  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },

  primevue: {
    options: {
      theme: 'none', // we use Tailwind + custom theming
      ripple: true,
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'MTG Vault',
      short_name: 'MTGVault',
      description: 'Your personal Magic: The Gathering collection manager',
      theme_color: '#1a1625',
      background_color: '#1a1625',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\.scryfall\.com\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'scryfall-api',
            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 }, // 24h
          },
        },
        {
          urlPattern: /^https:\/\/cards\.scryfall\.io\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'card-images',
            expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30d
          },
        },
        {
          urlPattern: /^https:\/\/data\.scryfall\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'scryfall-bulk',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7d
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },

  app: {
    head: {
      title: 'MTG Vault',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Personal MTG collection & deck manager' },
        { name: 'theme-color', content: '#1a1625' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap',
        },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  vite: {
    worker: {
      format: 'es',
    },
  },

  typescript: {
    strict: true,
  },

  compatibilityDate: '2024-11-01',
})
