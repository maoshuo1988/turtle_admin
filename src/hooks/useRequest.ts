import { useCallback, useMemo } from 'react';
import { useMutation, useQuery } from 'react-query';
import {
  API_CAPTCHA_REQUEST_IMAGE,
  API_LOGIN_SIGNIN,
  API_LOGIN_SIGNOUT,
  API_USER_CURRENT,
} from '@/api/api';
import { axiosCustom } from '@/api/axios';
import type {
  CurrentUser,
  ImageCaptchaPayload,
  LoginPayload,
  LoginResult,
  RemoteAuthUser,
  RemoteLoginResult,
} from '@/types/auth';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';
import {
  clearAuthStorage,
  getAccessToken,
  getCurrentUserFromStorage,
  normalizeCurrentUser,
  persistAuth,
} from '@/utils/auth';

interface ManualRequestResult<TResult, TParams extends unknown[]> {
  run: (...args: TParams) => Promise<TResult>;
  data: TResult | undefined;
  loading: boolean;
  error: Error | undefined;
}

interface QueryRequestResult<TResult> {
  run: () => Promise<TResult>;
  data: TResult | undefined;
  loading: boolean;
  error: Error | undefined;
  refresh: () => Promise<TResult>;
}

function assertCurrentUser(user: RemoteAuthUser | undefined) {
  const currentUser = normalizeCurrentUser(user);

  if (!currentUser) {
    throw new Error('未获取到有效的用户信息');
  }

  return currentUser;
}

export async function requestImageCaptchaQuery() {
  const response = await axiosCustom<ImageCaptchaPayload>({
    method: 'get',
    cmd: API_CAPTCHA_REQUEST_IMAGE,
  });

  return assertSuccess(response);
}

export async function requestSignInQuery(payload: LoginPayload): Promise<LoginResult> {
  const response = await axiosCustom<RemoteLoginResult>({
    method: 'post',
    cmd: API_LOGIN_SIGNIN,
    data: new URLSearchParams({
      username: payload.account.trim(),
      password: payload.password,
      redirect: '',
      captchaId: payload.captchaId,
      captchaCode: payload.captchaCode.trim(),
      captchaProtocol: String(payload.captchaProtocol),
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  const result = assertSuccess(response);

  if (!result?.token) {
    throw new Error('登录成功，但未返回 token');
  }

  const loginResult = {
    accessToken: result.token,
    currentUser: assertCurrentUser(result.user),
    rawUser: result.user,
  };

  persistAuth(loginResult);
  return loginResult;
}

export async function requestSignoutQuery() {
  try {
    const response = await axiosCustom({
      method: 'get',
      cmd: API_LOGIN_SIGNOUT,
      headers: getAuthorizationHeaders(),
    });

    assertSuccess(response);
  } finally {
    clearAuthStorage();
  }
}

export async function requestUserCurrentQuery(): Promise<CurrentUser | undefined> {
  const token = getAccessToken();

  if (!token) {
    return getCurrentUserFromStorage();
  }

  try {
    const response = await axiosCustom<RemoteAuthUser>({
      method: 'get',
      cmd: API_USER_CURRENT,
      headers: getAuthorizationHeaders(),
    });
    const remoteUser = assertSuccess(response);
    const currentUser = assertCurrentUser(remoteUser);

    persistAuth({
      accessToken: token,
      currentUser,
      rawUser: remoteUser,
    });

    return currentUser;
  } catch {
    const cachedUser = getCurrentUserFromStorage();

    if (!cachedUser) {
      clearAuthStorage();
    }

    return cachedUser;
  }
}

export function useRequestImageCaptcha() {
  const mutation = useMutation<ImageCaptchaPayload, Error, void>({
    mutationKey: ['requestImageCaptcha'],
    mutationFn: async () => requestImageCaptchaQuery(),
  });
  const { data, isLoading, error, mutateAsync } = mutation;

  const run = useCallback(async () => mutateAsync(), [mutateAsync]);

  return useMemo(() => ({
    run,
    data,
    loading: isLoading,
    error: error ?? undefined,
  }), [data, error, isLoading, run]) as ManualRequestResult<ImageCaptchaPayload, []>;
}

export function useRequestSignIn() {
  const mutation = useMutation<LoginResult, Error, LoginPayload>({
    mutationKey: ['requestSignIn'],
    mutationFn: async (payload) => requestSignInQuery(payload),
  });
  const { data, isLoading, error, mutateAsync } = mutation;

  const run = useCallback(async (payload: LoginPayload) => mutateAsync(payload), [mutateAsync]);

  return useMemo(() => ({
    run,
    data,
    loading: isLoading,
    error: error ?? undefined,
  }), [data, error, isLoading, run]) as ManualRequestResult<LoginResult, [LoginPayload]>;
}

export function useRequestSignout() {
  const mutation = useMutation<void, Error, void>({
    mutationKey: ['requestSignout'],
    mutationFn: async () => requestSignoutQuery(),
  });
  const { data, isLoading, error, mutateAsync } = mutation;

  const run = useCallback(async () => mutateAsync(), [mutateAsync]);

  return useMemo(() => ({
    run,
    data,
    loading: isLoading,
    error: error ?? undefined,
  }), [data, error, isLoading, run]) as ManualRequestResult<void, []>;
}

export function useRequestUserCurrent() {
  const query = useQuery<CurrentUser | undefined, Error>({
    queryKey: ['requestUserCurrent'],
    queryFn: async () => requestUserCurrentQuery(),
  });
  const { data, isLoading, isFetching, error, refetch } = query;

  const run = useCallback(async () => {
    const result = await refetch();
    if (result.error) {
      throw result.error;
    }
    return result.data;
  }, [refetch]);

  const refresh = useCallback(async () => {
    const result = await refetch();
    if (result.error) {
      throw result.error;
    }
    return result.data;
  }, [refetch]);

  return useMemo(() => ({
    run,
    refresh,
    data,
    loading: isLoading || isFetching,
    error: error ?? undefined,
  }), [data, error, isFetching, isLoading, refresh, run]) as QueryRequestResult<CurrentUser | undefined>;
}
