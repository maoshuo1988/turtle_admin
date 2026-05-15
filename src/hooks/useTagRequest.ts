import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useState } from 'react';
import {
  API_TAG_AUTOCOMPLETE,
  API_TAG_COMMENT_STATS,
  API_TAG_CREATE,
  API_TAG_TAGS,
  getTagByPath,
} from '@/api/tag_api';
import { axiosCustom } from '@/api/axios';
import type {
  TagBrief,
  TagCommentStatRow,
  TagCreatePayload,
  TagCreateResponse,
  TagListParams,
  TagPageResult,
} from '@/types/tag';
import {
  extractTagPagedResults,
  mapTagBrief,
  mapTagCommentStatRow,
} from '@/utils/tagAdapters';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';

function toUrlEncoded(payload: Record<string, string | undefined>) {
  const form = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    form.append(key, String(value));
  });
  return form;
}

interface ManualRequestResult<TResult, TParams extends unknown[]> {
  run: (...args: TParams) => Promise<TResult>;
  data: TResult | undefined;
  loading: boolean;
  error: Error | undefined;
  refresh: () => Promise<TResult>;
}

function useLazyQueryRequest<TResult, TParams>(
  idleQueryKey: unknown[],
  queryKeyFactory: (params: TParams) => unknown[],
  queryFn: (params: TParams) => Promise<TResult>,
): ManualRequestResult<TResult, [TParams]> {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<TParams | undefined>();

  const query = useQuery<TResult, Error>({
    queryKey: params !== undefined ? queryKeyFactory(params) : idleQueryKey,
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

async function requestTagCreate(payload: TagCreatePayload): Promise<TagCreateResponse> {
  const trimmedName = payload.name.trim();
  const response = await axiosCustom<TagCreateResponse>({
    method: 'post',
    cmd: API_TAG_CREATE,
    data: toUrlEncoded({
      name: trimmedName,
      description: payload.description?.trim(),
    }),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });
  const data = assertSuccess(response);
  return data as TagCreateResponse;
}

async function requestTagList(params: TagListParams): Promise<TagPageResult<TagBrief>> {
  const response = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_TAG_TAGS,
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      keyword: params.keyword?.trim(),
    },
    headers: getAuthorizationHeaders(),
  });
  const data = assertSuccess(response);
  const { results, total, page, limit } = extractTagPagedResults(data, mapTagBrief);
  return { results, total, page, limit };
}

async function requestTagById(tagId: number): Promise<TagBrief> {
  const response = await axiosCustom<unknown>({
    method: 'get',
    cmd: getTagByPath(tagId),
    headers: getAuthorizationHeaders(),
  });
  const data = assertSuccess(response);
  return mapTagBrief(data);
}

async function requestTagAutocomplete(input: string): Promise<TagBrief[]> {
  const response = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_TAG_AUTOCOMPLETE,
    data: toUrlEncoded({ input: input.trim() }),
    headers: getAuthorizationHeaders(),
  });
  const data = assertSuccess(response);

  if (Array.isArray(data)) {
    return data.map(mapTagBrief);
  }

  const { results } = extractTagPagedResults(data, mapTagBrief);
  return results;
}

async function requestTagCommentStats(params: TagListParams): Promise<TagPageResult<TagCommentStatRow>> {
  const response = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_TAG_COMMENT_STATS,
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      keyword: params.keyword?.trim(),
    },
    headers: getAuthorizationHeaders(),
  });
  const data = assertSuccess(response);
  const { results, total, page, limit } = extractTagPagedResults(data, mapTagCommentStatRow);
  return { results, total, page, limit };
}

function stableTagListKey(params: TagListParams) {
  return [
    'requestTagList',
    params.page ?? 1,
    params.limit ?? 20,
    params.keyword?.trim() ?? '',
  ];
}

export function useRequestTagList() {
  return useLazyQueryRequest(['requestTagList', '__idle'], stableTagListKey, requestTagList);
}

export function useRequestTagById() {
  return useLazyQueryRequest(['requestTagById', '__idle'], (tagId: number) => ['requestTagById', tagId], requestTagById);
}

export function useRequestTagCreate() {
  return useMutationRequest(['requestTagCreate'], requestTagCreate);
}

export function useRequestTagAutocomplete() {
  return useMutationRequest(['requestTagAutocomplete'], requestTagAutocomplete);
}

function stableCommentStatsKey(params: TagListParams) {
  return [
    'requestTagCommentStats',
    params.page ?? 1,
    params.limit ?? 20,
    params.keyword?.trim() ?? '',
  ];
}

export function useRequestTagCommentStats() {
  return useLazyQueryRequest(
    ['requestTagCommentStats', '__idle'],
    stableCommentStatsKey,
    requestTagCommentStats,
  );
}
