
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.AUTH_USERS': JSON.stringify(process.env.AUTH_USERS),
  },
  build: {
    outDir: 'dist',
  },
});
