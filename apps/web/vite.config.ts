import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/services',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      includeAssets: ['favicon.ico', 'robots.txt', 'images/icons/*.png'],
      injectManifest: {
        globIgnores: [
          '**/*.wasm',
          '**/*.onnx',
        ],
      },
      manifest: {
        name: 'Mood Journal',
        short_name: 'MoodJournal',
        description: 'Track your mood and insights offline.',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        categories: ['health', 'productivity', 'lifestyle'],
        lang: 'en-US',
        icons: [
          {
            src: '/images/icons/192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/images/icons/512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/images/icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
