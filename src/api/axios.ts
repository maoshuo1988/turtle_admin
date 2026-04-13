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

type AxiosRequestData = object | FormData | URLSearchParams | unknown[] | string;

type TurtleResponseResult<T> = TurtleResponseEnvelope<T> | '' | null | undefined;

interface AxiosCustomOptions {
  cmd: string;
  method?: 'get' | 'post' | 'delete' | 'put' | 'patch';
  headers?: Record<string, string | number | boolean>;
  params?: Record<string, unknown>;
  data?: AxiosRequestData;
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
  if (method !== 'post' && method !== 'put' && method !== 'patch') {
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
    }) as TurtleResponseResult<T>;

    if (response === undefined || response === null || response === '') {
      return {
        code: 0,
        cmd,
        method,
        msg: undefined,
        message: undefined,
        data: {} as T,
        success: true,
      };
    }

    return {
      code: Number(response?.errorCode ?? 0),
      cmd,
      method,
      msg: response?.message,
      message: response?.message,
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
      const redirectPath =
        history.location.pathname && history.location.pathname !== LOGIN_PATH
          ? `${history.location.pathname}${history.location.search || ''}`
          : '';
      const loginTarget = redirectPath
        ? `${LOGIN_PATH}?redirect=${encodeURIComponent(redirectPath)}`
        : LOGIN_PATH;

      history.replace(loginTarget);
    }

    return {
      code: 0,
      cmd,
      method,
      msg: getRequestErrorMessage(error),
      message: getRequestErrorMessage(error),
      data: {} as T,
      success: false,
    };
  }
}
