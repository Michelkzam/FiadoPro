import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { spawn } from 'child_process'
import { existsSync } from 'fs'

function baileysPlugin() {
  let serverProcess = null
  return {
    name: 'baileys-server',
    configureServer(server) {
      const serverDir = path.resolve(__dirname, 'server')
      const serverEntry = path.join(serverDir, 'index.js')
      if (!existsSync(serverEntry)) return

      server.httpServer?.once('listening', () => {
        serverProcess = spawn('node', [serverEntry], {
          cwd: serverDir,
          stdio: 'inherit',
          env: { ...process.env, PORT: '3001' },
        })
        serverProcess.on('error', (err) => {
          console.error('[Baileys] Erro ao iniciar:', err.message)
        })
      })

      process.on('exit', () => {
        if (serverProcess) serverProcess.kill()
      })
    },
  }
}

export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
    baileysPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60,
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|gif|jpg|jpeg|webp|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      client: {
        installPrompt: true,
        periodicSyncForUpdates: 3600,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/qr': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/status': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
