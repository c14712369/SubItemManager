import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'SubItemManager 收支管理系統',
        short_name: '收支管理',
        description: '記錄每一筆固定支出與日常生活費的財務管理工具',
        theme_color: '#C17B2E',
        background_color: '#F0EDE8',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '192x192',
            type: 'image/x-icon'
          },
          {
            src: 'favicon.ico',
            sizes: '512x512',
            type: 'image/x-icon'
          }
        ]
      }
    })
  ],
  base: '/',
  root: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  css: {
    devSourcemap: true,
  },
});
