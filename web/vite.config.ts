/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

type ProxyEvents = {
  on(event: 'proxyRes', listener: (res: { headers: Record<string, unknown> }) => void): void;
};

/**
 * App người dân bản web (Flutter, đóng gói vào public/citizen bằng `npm run build:citizen`) là một SPA riêng: đường dẫn con
 * không phải file tĩnh (vd. /citizen/pay/4) trả về index.html của nó, không rơi vào web quản trị.
 */
const citizenSpa = (): Plugin => ({
  name: 'citizen-spa',
  configureServer(server) {
    server.middlewares.use((req: { url?: string }, _res: unknown, next: () => void) => {
      if (req.url && /^\/citizen(\/[^.?]*)?(\?.*)?$/.test(req.url)) req.url = '/citizen/index.html';
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), citizenSpa()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      // Jmix Admin (jmix-admin/, cổng 8081) nhúng vào trang admin bằng iframe cùng origin.
      '/jmix': {
        target: 'http://localhost:8081',
        ws: true,
        configure: (proxy) => {
          (proxy as unknown as ProxyEvents).on('proxyRes', (res) => {
            // Jmix mặc định chặn iframe (DENY); cùng origin thì cho phép.
            res.headers['x-frame-options'] = 'SAMEORIGIN';
          });
        },
      },
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
