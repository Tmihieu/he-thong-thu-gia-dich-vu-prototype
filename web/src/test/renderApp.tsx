import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';

import { AuthProvider } from '../app/auth/AuthProvider';
import { createQueryClient } from '../app/queryClient';
import { routes } from '../app/routes';

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Giả lập fetch theo đường dẫn; đường dẫn không khai báo trả 404. */
export function mockApi(handlers: Record<string, Handler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const key = `${init.method ?? 'GET'} ${url.split('?')[0]}`;
    const handler = handlers[key];
    return handler ? handler(url, init) : jsonResponse(404, { code: 'NOT_FOUND', message: 'không có mock' });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** Render toàn bộ route của app tại một đường dẫn, có AuthProvider và React Query thật. */
export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...utils, router };
}
