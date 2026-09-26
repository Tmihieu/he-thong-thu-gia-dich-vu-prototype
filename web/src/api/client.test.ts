import { afterEach, vi } from 'vitest';

import { api, ApiError, setTokenGetter, setUnauthorizedHandler } from './client';

function mockFetch(response: Response | Error) {
  const fn = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
  vi.stubGlobal('fetch', fn);
  return fn;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  setTokenGetter(() => null);
  setUnauthorizedHandler(() => {});
});

describe('api client', () => {
  it('gắn Bearer token và query params, bỏ tham số rỗng', async () => {
    setTokenGetter(() => 'abc');
    const fetchFn = mockFetch(json(200, [{ id: 1 }]));

    const data = await api.get<{ id: number }[]>('/api/remittance/ledger', { params: { periodId: 7, q: '' } });

    expect(data).toEqual([{ id: 1 }]);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/remittance/ledger?periodId=7');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('gửi body JSON khi POST', async () => {
    const fetchFn = mockFetch(json(201, { id: 5 }));
    await api.post('/api/x', { amount: 80000 });
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"amount":80000}');
  });

  it('đổi lỗi {code, message} thành ApiError', async () => {
    mockFetch(json(422, { code: 'RECEIPT_AMOUNT_OUT_OF_RANGE', message: 'Số tiền phải lớn hơn 0' }));
    const err = await api.get('/api/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: 'RECEIPT_AMOUNT_OUT_OF_RANGE', message: 'Số tiền phải lớn hơn 0' });
  });

  it('lỗi không phải JSON vẫn thành ApiError có thông báo tiếng Việt', async () => {
    mockFetch(new Response('Bad gateway', { status: 502 }));
    await expect(api.get('/api/x')).rejects.toMatchObject({ status: 502, code: 'HTTP_502' });
  });

  it('mất kết nối → NETWORK_ERROR', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    await expect(api.get('/api/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('204 trả undefined', async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(api.delete('/api/x/1')).resolves.toBeUndefined();
  });

  it('401 khi đã gửi token thì gọi unauthorizedHandler; chưa có token thì không', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    mockFetch(json(401, { code: 'UNAUTHORIZED', message: 'Hết hạn' }));
    await expect(api.post('/api/platform/auth/login', {})).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();

    setTokenGetter(() => 'het-han');
    mockFetch(json(401, { code: 'UNAUTHORIZED', message: 'Hết hạn' }));
    await expect(api.get('/api/x')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
