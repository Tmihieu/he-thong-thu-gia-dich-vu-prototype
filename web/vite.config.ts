/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env: { TZ: 'Asia/Ho_Chi_Minh' },
    // Form AntD trong jsdom chậm khi gõ phím; 5 giây mặc định không đủ cho test đăng nhập.
    testTimeout: 15000,
  },
});
