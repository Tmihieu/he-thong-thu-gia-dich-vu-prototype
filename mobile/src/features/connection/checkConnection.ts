import { api } from '../../api/client';

export interface ConnectionResult {
  title: string;
  version: string;
  pathCount: number;
  elapsedMs: number;
}

interface OpenApiDoc {
  info?: { title?: string; version?: string };
  paths?: Record<string, unknown>;
}

/** Gọi tài liệu OpenAPI (mở công khai) để xác nhận điện thoại tới được backend qua mạng LAN. */
export async function checkConnection(now: () => number = Date.now): Promise<ConnectionResult> {
  const started = now();
  const doc = await api.get<OpenApiDoc>('/v3/api-docs');
  return {
    title: doc?.info?.title ?? 'Không rõ',
    version: doc?.info?.version ?? '?',
    pathCount: Object.keys(doc?.paths ?? {}).length,
    elapsedMs: now() - started,
  };
}
