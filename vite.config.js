import { defineConfig } from 'vite';

export default defineConfig({
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
    devSourcemap: true, // maps DevTools rules back to source module (e.g. life.css:42)
  },
});
