import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' (not 'autoUpdate') so a new version waits for the user to
      // confirm via the in-app update prompt (useAppUpdate) instead of
      // silently taking over — mid-task auto-reloads are the opposite of calm.
      registerType: 'prompt',
      // injectManifest (not the default generateSW) so we own the service worker
      // source (src/sw.ts) and can add push / notificationclick handlers for
      // real Web Push, while still precaching for offline. The SW must reference
      // self.__WB_MANIFEST (it does) — that token is where the precache manifest
      // is injected at build time.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/badge-96.png'],
      manifest: {
        id: '/',
        name: 'Cura',
        short_name: 'Cura',
        description: 'Een rustige, gedeelde huishoudplanner voor twee.',
        start_url: '/',
        display: 'standalone',
        background_color: '#EBE6D5',
        theme_color: '#EBE6D5',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // In injectManifest mode the `workbox` block is ignored; these globs must
      // live under `injectManifest` or the precache silently narrows to its
      // default (js/css/html) and offline image loading regresses.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico}'],
        // iOS fetches the splash screens itself via <link rel="apple-touch-startup-image">
        // at Add-to-Home-Screen time, and background.png only lives on as that artwork's
        // source — precaching them would push ~18 MB into every visitor's cache.
        globIgnores: ['splash/**', 'background.png'],
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-motion': ['motion'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
