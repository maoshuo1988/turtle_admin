import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useState } from 'react';
import {
  API_ADMIN_PK_RECALC_HEAT,
  API_ADMIN_PK_ROUND_LIST,
  API_ADMIN_PK_SEASON_LIST,
  API_ADMIN_PK_TOPIC_LIST,
  API_ADMIN_PK_TOPIC_SAVE,
  API_ADMIN_PK_TOPIC_STATUS,
} from '@/api/admin_pk_api';
import { axiosCustom } from '@/api/axios';
import type {
  AdminPkRecalcHeatPayload,
  AdminPkRoundListParams,
  AdminPkSeasonListParams,
  AdminPkTopicListParams,
  AdminPkTopicSavePayload,
  AdminPkTopicStatusPayload,
} from '@/types/adminPk';
import {
  mapAdminPkRoundRow,
  mapAdminPkSeasonRow,
  mapAdminPkTopicRow,
  normalizeAdminPkPageResult,
} from '@/utils/adminPkAdapters';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';

interface ManualRequestResult<TResult, TParams extends unknown[]> {
  run: (...args: TParams) => Promise<TResult>;
  data: TResult | undefined;
  loading: boolean;
  error: Error | undefined;
  refresh: () => Promise<TResult>;
}

function useLazyQueryRequest<TResult, TParams>(
  queryKeyFactory: (params: TParams) => unknown[],
  queryFn: (params: TParams) => Promise<TResult>,
): ManualRequestResult<TResult, [TParams]> {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<TParams | undefined>();

  const query = useQuery<TResult, Error>({
    queryKey: params ? queryKeyFactory(params) : ['admin-pk-idle-query'],
    queryFn: () => queryFn(params as TParams),
    enabled: params !== undefined,
  });

  return {
    run: async (nextParams: TParams) => {
      setParams(nextParams);
      return queryClient.fetchQuery(queryKeyFactory(nextParams), () => queryFn(nextParams));
    },
    data:
      params !== undefined
        ? ((query.data ??
            queryClient.getQueryData(queryKeyFactory(params))) as TResult | undefined)
        : undefined,
    loading: query.isLoading || query.isFetching,
    error: query.error ?? undefined,
    refresh: async () => {
      if (params === undefined) {
        throw new Error('当前请求尚未初始化');
      }

      return queryClient.fetchQuery(queryKeyFactory(params), () => queryFn(params));
    },
  };
}

function useMutationRequest<TResult, TVariables>(
  mutationKey: unknown[],
  mutationFn: (variables: TVariables) => Promise<TResult>,
): ManualRequestResult<TResult, [TVariables]> {
  const mutation = useMutation<TResult, Error, TVariables>({
    mutationKey,
    mutationFn,
  });

  return {
    run: async (variables: TVariables) => mutation.mutateAsync(variables),
    data: mutation.data,
    loading: mutation.isLoading,
    error: mutation.error ?? undefined,
    refresh: async () => {
      if (mutation.data === undefined) {
        throw new Error('当前操作暂无可刷新的结果');
      }

      return mutation.data;
    },
  };
}

function toPageQuery(params: { current?: number; pageSize?: number }) {
  return {
    page: params.current ?? 1,
    pageSize: params.pageSize ?? 20,
  };
}

async function requestAdminPkTopics(params: AdminPkTopicListParams = {}) {
  const response = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_PK_TOPIC_LIST,
    params: {
      ...toPageQuery(params),
      status: params.status,
      q: params.q || params.keyword,
    },
    headers: getAuthorizationHeaders(),
  });

  return normalizeAdminPkPageResult(assertSuccess(response), mapAdminPkTopicRow);
}

async function requestSaveAdminPkTopic(payload: AdminPkTopicSavePayload) {
  const response = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_PK_TOPIC_SAVE,
    data: payload,
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return assertSuccess(response);
}

async function requestUpdateAdminPkTopicStatus(payload: AdminPkTopicStatusPayload) {
  const response = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_PK_TOPIC_STATUS,
    data: payload,
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return assertSuccess(response);
}

async function requestAdminPkRounds(params: AdminPkRoundListParams = {}) {
  const response = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_PK_ROUND_LIST,
    params: {
      ...toPageQuery(params),
      topicId: params.topicId,
      phase: params.phase,
      winner: params.winner,
      startTime: params.startTime,
      endTime: params.endTime,
    },
    headers: getAuthorizationHeaders(),
  });

  return normalizeAdminPkPageResult(assertSuccess(response), mapAdminPkRoundRow);
}

async function requestAdminPkSeasons(params: AdminPkSeasonListParams = {}) {
  const response = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_PK_SEASON_LIST,
    params: {
      ...toPageQuery(params),
      topicId: params.topicId,
      status: params.status,
    },
    headers: getAuthorizationHeaders(),
  });

  return normalizeAdminPkPageResult(assertSuccess(response), mapAdminPkSeasonRow);
}

async function requestRecalcAdminPkHeat(payload: AdminPkRecalcHeatPayload) {
  const response = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_PK_RECALC_HEAT,
    data: payload,
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return assertSuccess(response);
}

export function useRequestAdminPkTopics() {
  return useLazyQueryRequest(
    (params: AdminPkTopicListParams) => ['requestAdminPkTopics', params],
    requestAdminPkTopics,
  );
}

export function useRequestSaveAdminPkTopic() {
  return useMutationRequest(['requestSaveAdminPkTopic'], requestSaveAdminPkTopic);
}

export function useRequestUpdateAdminPkTopicStatus() {
  return useMutationRequest(['requestUpdateAdminPkTopicStatus'], requestUpdateAdminPkTopicStatus);
}

export function useRequestAdminPkRounds() {
  return useLazyQueryRequest(
    (params: AdminPkRoundListParams) => ['requestAdminPkRounds', params],
    requestAdminPkRounds,
  );
}

export function useRequestAdminPkSeasons() {
  return useLazyQueryRequest(
    (params: AdminPkSeasonListParams) => ['requestAdminPkSeasons', params],
    requestAdminPkSeasons,
  );
}

export function useRequestRecalcAdminPkHeat() {
  return useMutationRequest(['requestRecalcAdminPkHeat'], requestRecalcAdminPkHeat);
}
