import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'elysiq-embed.js',
        assetFileNames: 'elysiq-embed.[ext]',
      },
    },
  },
});
