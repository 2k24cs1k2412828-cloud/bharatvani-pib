import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/videos': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/presenter.jpg': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
