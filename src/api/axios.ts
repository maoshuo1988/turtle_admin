import { history, request } from '@umijs/max';
import { TURTLE_API_BASE } from './api';
import type { TurtleRequestResult } from '@/utils/requestUtils';
import { clearAuthStorage, LOGIN_PATH } from '@/utils/auth';

interface TurtleResponseEnvelope<T> {
  errorCode?: number;
  message?: string;
  data?: T;
  success?: boolean;
}

interface AxiosCustomOptions {
  cmd: string;
  method?: 'get' | 'post' | 'delete' | 'put';
  headers?: Record<string, string | number | boolean>;
  params?: Record<string, unknown>;
  data?: Record<string, unknown> | FormData | URLSearchParams | unknown[] | string;
}

function getRequestErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeResponse = error as {
      response?: {
        data?: {
          message?: string;
        };
        status?: number;
      };
      data?: {
        message?: string;
      };
      message?: string;
    };

    return (
      maybeResponse.response?.data?.message ||
      maybeResponse.data?.message ||
      maybeResponse.message ||
      '请求失败，请稍后重试'
    );
  }

  return '请求失败，请稍后重试';
}

function resolveRequestType(
  method: AxiosCustomOptions['method'],
  data: AxiosCustomOptions['data'],
  headers: AxiosCustomOptions['headers'],
) {
  if (method !== 'post' && method !== 'put') {
    return undefined;
  }

  if (!data || data instanceof FormData) {
    return undefined;
  }

  if (data instanceof URLSearchParams) {
    return 'form';
  }

  const contentType = String(headers?.['Content-Type'] ?? headers?.['content-type'] ?? '').toLowerCase();

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return 'form';
  }

  if (contentType.includes('application/json')) {
    return 'json';
  }

  return undefined;
}

export async function axiosCustom<T>({
  cmd,
  headers = {},
  params,
  method = 'get',
  data,
}: AxiosCustomOptions): Promise<TurtleRequestResult<T>> {
  try {
    const response = await request(`${TURTLE_API_BASE}${cmd}`, {
      method: method.toUpperCase(),
      headers,
      params,
      data,
      withCredentials: true,
      skipErrorHandler: true,
      requestType: resolveRequestType(method, data, headers),
    }) as TurtleResponseEnvelope<T>;

    return {
      code: Number(response?.errorCode ?? 0),
      cmd,
      method,
      msg: response?.message,
      data: (response?.data ?? {}) as T,
      success: response?.success === true,
    };
  } catch (error) {
    const maybeResponse = error as {
      response?: {
        status?: number;
      };
    };
    const status = maybeResponse?.response?.status;

    if (status === 401) {
      clearAuthStorage();
      history.push(LOGIN_PATH);
    }

    return {
      code: 0,
      cmd,
      method,
      msg: getRequestErrorMessage(error),
      data: {} as T,
      success: false,
    };
  }
}
