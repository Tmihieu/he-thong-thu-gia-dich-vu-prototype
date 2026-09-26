/**
 * Wrapper `fetch` cho API backend: gắn Bearer token, đổi lỗi `{code, message}` thành `ApiError`.
 * Đường dẫn truyền vào đã gồm tiền tố `/api` (Vite proxy chuyển sang :8080 khi chạy dev).
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  params?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
}

let tokenGetter: () => string | null = () => null;

/** Đăng ký nơi lấy access token (đặt ở T08 khi có đăng nhập). */
export function setTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
}

function buildUrl(path: string, params?: Record<string, QueryValue>): string {
  if (!params) return path;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
      const { code, message } = data as { code: unknown; message: unknown };
      return new ApiError(res.status, String(code), String(message));
    }
  } catch {
    // thân lỗi không phải JSON
  }
  return new ApiError(res.status, `HTTP_${res.status}`, 'Máy chủ trả lỗi không mong đợi. Vui lòng thử lại.');
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenGetter();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.params), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng.');
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>('DELETE', path, options),
};
