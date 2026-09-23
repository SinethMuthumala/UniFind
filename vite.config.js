import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs on :5000. Requests to /api and /uploads are proxied
// so the browser only ever talks to one origin (same as nginx in Docker).
const target = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': target,
      '/uploads': target,
    },
  },
});
