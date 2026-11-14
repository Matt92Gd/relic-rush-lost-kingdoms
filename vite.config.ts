import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: ['@babylonjs/core', '@babylonjs/loaders'],
          react: ['react', 'react-dom', 'lucide-react'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
  },
});
