import { getAccessToken } from '@/utils/auth';

export interface TurtleRequestResult<T> {
  code: number;
  cmd: string;
  method: string;
  msg?: unknown;
  message?: unknown;
  data: T;
  success: boolean;
}

export function getAuthorizationHeaders() {
  const token = getAccessToken();
  return token ? ({ Authorization: `Bearer ${token}` } as Record<string, string>) : undefined;
}

export function assertSuccess<T>(response: TurtleRequestResult<T>) {
  if (response.success !== true) {
    throw new Error(String(response.message ?? response.msg ?? '请求失败，请稍后重试'));
  }

  return response.data;
}
