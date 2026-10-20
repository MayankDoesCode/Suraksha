import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Where /api is proxied. PORT is honoured as the backend port (backend/run.py reads it too), except when
// it is this dev server's own port: tools and hosts often set PORT for the frontend, and proxying to
// ourselves loops every API call into a 500. BACKEND_PORT or VITE_BACKEND_URL always win.
const argPort = (() => {
  const i = process.argv.indexOf('--port');
  return i > -1 ? process.argv[i + 1] : null;
})();
const ownPorts = new Set(['5173', argPort].filter(Boolean));
const backendPort =
  process.env.BACKEND_PORT || (process.env.PORT && !ownPorts.has(process.env.PORT) ? process.env.PORT : '5000');
const backendTarget = process.env.VITE_BACKEND_URL || `http://127.0.0.1:${backendPort}`;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});
