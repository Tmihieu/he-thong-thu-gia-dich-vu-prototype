import { configureApi } from '../../api/client';
import { checkConnection } from './checkConnection';

beforeEach(() => {
  configureApi({ baseUrl: 'http://10.0.0.5:8080' });
});

it('đọc tên, phiên bản và số endpoint từ /v3/api-docs', async () => {
  const fetchMock = jest.fn().mockResolvedValue(
    new Response(JSON.stringify({ info: { title: 'VSMT API', version: 'v1' }, paths: { '/a': {}, '/b': {} } }), {
      status: 200,
    }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const clock = jest.fn().mockReturnValueOnce(1000).mockReturnValueOnce(1250);

  const result = await checkConnection(clock);

  expect(fetchMock.mock.calls[0][0]).toBe('http://10.0.0.5:8080/v3/api-docs');
  expect(result).toEqual({ title: 'VSMT API', version: 'v1', pathCount: 2, elapsedMs: 250 });
});

it('ném ApiError khi không tới được máy chủ', async () => {
  globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;

  await expect(checkConnection()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
});
