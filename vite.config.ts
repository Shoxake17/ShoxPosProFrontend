import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import obfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
          maximumFileSizeToCacheInBytes: 5000000,
          cleanupOutdatedCaches: true,
          navigateFallback: 'index.html',
        },
        manifest: {
          name: 'OnDex Merchant Panel',
          short_name: 'OnDex Merchant',
          description: 'OnDex Merchant Panel',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          display_override: ['window-controls-overlay'],
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'ondexmerchant-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'ondexmerchant.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'ondexmerchant.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      }),
      // !isDev && obfuscator({
      //   options: {
      //     controlFlowFlattening: true,
      //     controlFlowFlatteningThreshold: 0.75,
      //     numbersToExpressions: true,
      //     simplify: true,
      //     stringArray: true,
      //     stringArrayThreshold: 0.75,
      //     splitStrings: true,
      //     unicodeEscapeSequence: false,
      //   },
      // }),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    server: {
      port: 3001,
      host: true,
      strictPort: true,
      allowedHosts: ['localhost', '*.ngrok-free.dev', '*.ngrok.io'],
      proxy: {
        '/api': {
          target: 'http://localhost:3300',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'ws://localhost:3300',
          ws: true,
        },
        '/ip-api': {
          target: 'https://freeipapi.com/api',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/ip-api/, ''),
        },
      },
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
        'Content-Security-Policy': [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https: blob:",
          "font-src 'self' data:",
          "connect-src 'self' ws: wss: http://localhost:3000 http://127.0.0.1:3000 https://cdn.jsdelivr.net https://freeipapi.com https://ipapi.co https://flagcdn.com https://generativelanguage.googleapis.com  https://cbu.uz",
        ].join('; '),
      },
    },

    preview: {
      port: 3001,
      host: true,
      allowedHosts: ['localhost', '*.ngrok-free.dev', '*.ngrok.io'],
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
        'Content-Security-Policy': [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https: blob:",
          "font-src 'self' data:",
          "connect-src 'self' ws: wss: http://localhost:3000 http://127.0.0.1:3000 https://cdn.jsdelivr.net https://freeipapi.com https://ipapi.co https://flagcdn.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.x.ai https://cbu.uz",
        ].join('; '),
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3300',
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          headers: { 'Origin': 'http://localhost:3000' },
        },
        '/socket.io': {
          target: 'http://localhost:3300',
          changeOrigin: true,
          secure: false,
          ws: true,
          headers: { 'Origin': 'http://localhost:3000' },
        },
        '/ip-api': {
          target: 'https://freeipapi.com/api',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/ip-api/, ''),
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
  };
});
