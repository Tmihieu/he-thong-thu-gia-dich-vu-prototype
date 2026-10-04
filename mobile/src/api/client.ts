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

// Bản web đóng gói vào web quản trị (đường dẫn /citizen, xem web/package.json `build:citizen`) chạy cùng origin: gọi /api
// qua proxy của nginx / Vite. Trên điện thoại `window.location` không có nên vẫn theo EXPO_PUBLIC_API_URL.
const sameOrigin = typeof window !== 'undefined' && window.location?.pathname?.startsWith('/citizen') ? window.location.origin : null;
// Phải đọc bằng dấu chấm để Expo inline giá trị lúc đóng gói.
let baseUrl = sameOrigin ?? process.env.EXPO_PUBLIC_API_URL ?? '';
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

/** Token hiện tại, cho tải không đi qua `api` (vd. `<Image>` hiện ảnh cần đăng nhập). */
export function getAccessToken(): string | null {
  return tokenGetter();
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

function toApiError(status: number, text: string): ApiError {
  try {
    const data: unknown = JSON.parse(text);
    if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
      const { code, message } = data as { code: unknown; message: unknown };
      return new ApiError(status, String(code), String(message));
    }
  } catch {
    // thân lỗi không phải JSON
  }
  return new ApiError(status, `HTTP_${status}`, 'Máy chủ trả lỗi không mong đợi. Vui lòng thử lại.');
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function requireRoot(): string {
  const root = getApiBaseUrl();
  if (!root) {
    throw new ApiError(0, 'API_URL_MISSING', 'Chưa cấu hình địa chỉ máy chủ (EXPO_PUBLIC_API_URL).');
  }
  return root;
}

function networkError(root: string): ApiError {
  return new ApiError(0, 'NETWORK_ERROR', `Không kết nối được máy chủ ${root}. Vui lòng kiểm tra mạng.`);
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const root = requireRoot();

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
    throw networkError(root);
  }

  if (!res.ok) {
    if (res.status === 401 && token) unauthorizedHandler();
    throw toApiError(res.status, await res.text().catch(() => ''));
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * POST multipart qua XMLHttpRequest: `fetch` toàn cục của Expo SDK 57 là `expo/fetch`, không gửi được phần tệp
 * `{uri, name, type}` của React Native; XHR của React Native thì tự đọc tệp theo `uri`.
 */
async function upload<T>(path: string, form: FormData): Promise<T> {
  const root = requireRoot();
  const token = tokenGetter();
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', root + path);
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        if (xhr.status === 401 && token) unauthorizedHandler();
        reject(toApiError(xhr.status, xhr.responseText));
        return;
      }
      try {
        resolve((xhr.responseText ? JSON.parse(xhr.responseText) : undefined) as T);
      } catch {
        reject(toApiError(xhr.status, ''));
      }
    };
    // Hết giờ / bị hủy không phát 'error': phải bắt riêng, nếu không promise treo và form kẹt trạng thái đang tải.
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.onerror = xhr.ontimeout = xhr.onabort = () => reject(networkError(root));
    xhr.send(form);
  });
}

export const api = {
  upload,
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>('DELETE', path, options),
};
