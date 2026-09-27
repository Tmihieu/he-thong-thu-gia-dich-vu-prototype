import { api, ApiError, configureApi, setTokenGetter, setUnauthorizedHandler } from './client';

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  configureApi({ baseUrl: 'http://192.168.1.10:8080/' });
  setTokenGetter(() => null);
  setUnauthorizedHandler(() => {});
});

describe('api client', () => {
  it('ghép base URL (bỏ dấu / thừa) với đường dẫn và tham số truy vấn', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await api.get('/api/citizen/charges', { params: { periodId: 7, status: undefined, q: '' } });

    expect(fetchMock.mock.calls[0][0]).toBe('http://192.168.1.10:8080/api/citizen/charges?periodId=7');
  });

  it('gắn Bearer token khi có token', async () => {
    setTokenGetter(() => 'abc');
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await api.get('/api/citizen/me');

    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer abc');
  });

  it('gửi thân JSON cho POST', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 1 }));

    const result = await api.post<{ id: number }>('/api/x', { a: 1 });

    const init = fetchMock.mock.calls[0][1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"a":1}');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(result).toEqual({ id: 1 });
  });

  it('đổi lỗi {code, message} của backend thành ApiError', async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, { code: 'PERIOD_LOCKED', message: 'Kỳ thu đã khóa.' }));

    await expect(api.post('/api/x', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      code: 'PERIOD_LOCKED',
      message: 'Kỳ thu đã khóa.',
    });
  });

  it('thân lỗi không phải JSON thì trả thông báo tiếng Việt chung', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 502 }));

    const err = await api.get('/api/x').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('HTTP_502');
    expect((err as ApiError).message).toMatch(/Máy chủ trả lỗi/);
  });

  it('mất mạng thì báo NETWORK_ERROR tiếng Việt, kèm địa chỉ máy chủ', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(api.get('/v3/api-docs')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: expect.stringContaining('http://192.168.1.10:8080'),
    });
  });

  it('401 khi đang có token thì gọi handler hết phiên; 401 khi chưa đăng nhập thì không', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValue(jsonResponse(401, { code: 'UNAUTHORIZED', message: 'Hết phiên.' }));

    await expect(api.get('/api/citizen/me')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();

    setTokenGetter(() => 'expired');
    await expect(api.get('/api/citizen/me')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('chưa cấu hình địa chỉ máy chủ thì báo lỗi rõ ràng, không gọi mạng', async () => {
    configureApi({ baseUrl: '' });

    await expect(api.get('/v3/api-docs')).rejects.toMatchObject({ code: 'API_URL_MISSING' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('204 trả undefined', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api.post('/api/x')).resolves.toBeUndefined();
  });
});
