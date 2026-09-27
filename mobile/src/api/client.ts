/**
 * Wrapper `fetch` cho API backend (cùng quy ước với `web/src/api/client.ts`): gắn Bearer token,
 * đổi lỗi `{code, message}` thành `ApiError`. Khác web: điện thoại không có proxy nên mọi đường dẫn
 * được ghép với địa chỉ máy chủ lấy từ `EXPO_PUBLIC_API_URL` (IP LAN của laptop chạy backend).
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

// Phải đọc bằng dấu chấm để Expo inline giá trị lúc đóng gói.
let baseUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
let tokenGetter: () => string | null = () => null;
let unauthorizedHandler: () => void = () => {};

export function configureApi(config: { baseUrl: string }): void {
  baseUrl = config.baseUrl;
}

export function getApiBaseUrl(): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

/** Đăng ký nơi lấy access token (AuthProvider). */
export function setTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
}

/** Gọi khi request có gửi token mà nhận 401 (token hết hạn/sai) để đưa về màn đăng nhập. */
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

function buildUrl(root: string, path: string, params?: Record<string, QueryValue>): string {
  const url = root + path;
  if (!params) return url;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
  }
  const qs = query.toString();
  return qs ? `${url}?${qs}` : url;
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

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const root = getApiBaseUrl();
  if (!root) {
    throw new ApiError(0, 'API_URL_MISSING', 'Chưa cấu hình địa chỉ máy chủ (EXPO_PUBLIC_API_URL).');
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenGetter();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(buildUrl(root, path, options.params), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new ApiError(0, 'NETWORK_ERROR', `Không kết nối được máy chủ ${root}. Vui lòng kiểm tra mạng.`);
  }

  if (!res.ok) {
    if (res.status === 401 && token) unauthorizedHandler();
    throw await toApiError(res);
  }
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
