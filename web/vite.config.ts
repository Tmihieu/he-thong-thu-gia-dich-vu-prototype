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
    // Mỗi file test nạp cả app + AntD trong jsdom; nhiều worker song song trên máy bận làm lần render đầu
    // vượt vài giây. Giới hạn worker và nới thời gian chờ để test không chập chờn.
    maxWorkers: 4,
    testTimeout: 60000,
  },
});
