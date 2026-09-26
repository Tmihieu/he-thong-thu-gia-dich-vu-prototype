import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Lần render đầu của AntD trong jsdom chậm; 1 giây mặc định của findBy* không đủ khi máy bận.
configure({ asyncUtilTimeout: 20000 });

// jsdom không có matchMedia; các component responsive của AntD cần hàm này.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
