import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import obfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      filename: 'manifest.webmanifest', // Fayl nomini qat'iy belgilash shids
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: false,
        type: 'module',
        navigateFallback: 'index.html',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5000000,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/api\//, /\/socket\.io\//],
      runtimeCaching: [
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'images',
      expiration: { maxEntries: 50 },
    },
  },
],
       // PWA konfiguratsiyasi
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'ShoxPosPro',
        short_name: 'ShoxPosPro',
        description: 'ShoxPosPro',
        theme_color: '#000000',
        background_color: '#000000', // Splash ekran foni
        display: 'standalone',
        display_override: ['window-controls-overlay'], 
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'shoxpospro.png', // Siz yuklagan shaffof logotip
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'shoxpospro.png', // 512x512 o'riniga ham hozircha shuni ishlatsak bo'ladi
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'shoxpospro.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Android uchun moslashuvchan ikonka
          }
        ]
      }
    }),
    obfuscator({
      options: {
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        numbersToExpressions: true,
        simplify: true,
        stringArray: true,
        stringArrayThreshold: 0.75,
        splitStrings: true,
        unicodeEscapeSequence: false, 
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 3001,
    host: true,
    strictPort: true,
    allowedHosts: [
      'localhost',
      '*.ngrok-free.dev',
      '*.ngrok.io'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // ✅ FIX 1: Cookie domain ni localhost ga yozamiz
        cookieDomainRewrite: 'localhost',
        // ✅ FIX 2: Origin headerni to'g'ri uzatamiz
        headers: {
          'Origin': 'http://localhost:3000',
        },
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        // ✅ FIX 3: WebSocket uchun ham Origin
        headers: {
          'Origin': 'http://localhost:3000',
        },
      },
    },
  },

  preview: {
    port: 3001,
    host: true,
    allowedHosts: [
      'localhost',
      '*.ngrok-free.dev',
      '*.ngrok.io'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        headers: {
          'Origin': 'http://localhost:3000',
        },
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        headers: {
          'Origin': 'http://localhost:3000',
        },
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});