import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Punto-de-Venta/',
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/react(-dom|router)/.test(id)) return 'vendor-react';
            if (/recharts/.test(id)) return 'vendor-charts';
            if (/jspdf/.test(id)) return 'vendor-pdf';
            if (/lucide-react/.test(id)) return 'vendor-icons';
            if (/date-fns/.test(id)) return 'vendor-date';
          }
          if (id.includes('src/lib/performance') || id.includes('src/lib/metricsCollector') ||
              id.includes('src/lib/healthMonitor') || id.includes('src/lib/productionGovernor') ||
              id.includes('src/lib/degradedModeEngine') || id.includes('src/lib/storageLifecycleManager') ||
              id.includes('src/lib/syncStateMachine') || id.includes('src/lib/interactionTracker') ||
              id.includes('src/lib/deviceDetector') || id.includes('src/lib/hardwareAdapter') ||
              id.includes('src/lib/structuredLogger') || id.includes('src/lib/incidentForensics') ||
              id.includes('src/lib/productionDiagnostics') || id.includes('src/lib/selfHealingUI') ||
              id.includes('src/lib/lifecycleGuard') || id.includes('src/lib/alertingEngine') ||
              id.includes('src/lib/auditLogger') || id.includes('src/lib/metricsCollector')) {
            return 'monitoring-core';
          }
          if (id.includes('src/hooks/useScan')) return 'scanner-core';
          if (id.includes('src/hooks/useScannerFocusEngine')) return 'scanner-core';
          if (id.includes('src/hooks/useScanSound')) return 'scanner-core';
          if (id.includes('src/lib/syncEngineV2') || id.includes('src/lib/syncManager') ||
              id.includes('src/lib/transactionalQueue') || id.includes('src/lib/snapshotManager')) {
            return 'sync-engine';
          }
          if (id.includes('src/lib/offlineDB') || id.includes('src/lib/offlineAuth') ||
              id.includes('src/lib/offlineTokenManager') || id.includes('src/lib/db')) {
            return 'offline-core';
          }
        },
      },
    },
    chunkSizeWarningLimit: 200,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Punto de Venta Pro',
        short_name: 'POS Pro',
        description: 'Sistema Profesional de Punto de Venta',
        theme_color: '#1e88e5',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/Punto-de-Venta/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\/auth\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'auth-cache',
              expiration: { maxEntries: 75, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            }
          },
          {
            urlPattern: /\/api\/products\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'products-cache',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            }
          },
          {
            urlPattern: /\.(?:js|css|woff2)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 },
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            }
          }
        ]
      }
    })
  ]
})
