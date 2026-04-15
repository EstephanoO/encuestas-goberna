import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'maplibre': ['maplibre-gl'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '^/api/(onpe|senadores|diputados)$': {
        target: 'http://161.132.39.165:8088',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/(onpe|senadores|diputados).*$/, '/$1.json'),
      },
      '^/api/provincias.*': {
        target: 'https://resultadoelectoral.onpe.gob.pe',
        changeOrigin: true,
        rewrite: () => '/presentacion-backend',
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
