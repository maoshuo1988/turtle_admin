import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useState } from 'react';
import {
  API_ADMIN_BATTLE_ACTIVE_USERS,
  API_ADMIN_BATTLE_RESOLVE,
  API_ADMIN_BATTLE_TRENDS,
  API_ADMIN_COIN_MINT,
  API_ADMIN_COMMENT_LIST,
  API_ADMIN_DASHBOARD_STATS,
  API_ADMIN_FORBIDDEN_WORD_CREATE,
  API_ADMIN_FORBIDDEN_WORD_DELETE,
  API_ADMIN_FORBIDDEN_WORD_LIST,
  API_ADMIN_FORBIDDEN_WORD_UPDATE,
  API_ADMIN_OPERATE_LOG_LIST,
  API_ADMIN_PREDICT_ACTIVE_USERS,
  API_ADMIN_PREDICT_MARKET_SETTLE,
  API_ADMIN_PREDICT_MARKET_STATS,
  API_ADMIN_PREDICT_STATS,
  API_ADMIN_PREDICT_TRENDS,
  API_ADMIN_TOPIC_AUDIT,
  API_ADMIN_TOPIC_DELETE,
  API_ADMIN_TOPIC_LIST,
  API_ADMIN_TOPIC_NODE_CREATE,
  API_ADMIN_TOPIC_NODE_LIST,
  API_ADMIN_TOPIC_NODE_NODES,
  API_ADMIN_TOPIC_NODE_UPDATE,
  API_ADMIN_TOPIC_NODE_UPDATE_SORT,
  API_ADMIN_TOPIC_RECOMMEND,
  API_ADMIN_TOPIC_UNDELETE,
  API_ADMIN_USER_GRANT_ADMIN,
  API_ADMIN_USER_LIST,
  API_ADMIN_USER_REPORT_LIST,
  API_ADMIN_USER_REPORT_UPDATE,
  API_ADMIN_USER_REVOKE_ADMIN,
  API_BATTLE_LIST,
  API_BATTLE_STATS,
  API_FOOTBALL_MARKETS,
  API_FOOTBALL_PREDICT_CONTEXT_UPDATE,
  API_PREDICT_TAG_LIST,
  API_PREDICT_TAG_REFRESH,
  API_USER_FORBIDDEN,
  getAdminCommentDeletePath,
  getAdminForbiddenWordByPath,
  getAdminTopicByPath,
  getAdminTopicNodeByPath,
  getAdminUserReportByPath,
  getTopicStickyPath,
} from '@/api/admin_api';
import { axiosCustom } from '@/api/axios';
import {
  fundRecords,
  PENALTY_RULES,
  type AdminBattle,
  type AdminMarket,
  type AdminTopic,
  type BannedUser,
  type FundRecord,
  type OpLog,
  type RiskAlert,
  type TrendPoint,
} from '@/data/admin_mock_data';
import type { PageParams, PageResult } from '@/types/http';
import type {
  AdminCommentRecord,
  AdminDashboardStatsResponse,
  AdminForbiddenWordRecord,
  AdminPredictStatsResponse,
  AdminRange,
  AdminTopicNodeRecord,
  AdminUserRecord,
  AdminUserReportRecord,
  AdminTrendResponse,
  BattleResolvePayload,
  PredictContextUpdatePayload,
  PredictMarketSettlePayload,
  PredictMarketStatsResponse,
  TopicAdminActionPayload,
  TopicNodePayload,
  TopicStickyPayload,
  UserForbiddenPayload,
  UserGrantAdminPayload,
  UserReportUpdatePayload,
  ForbiddenWordPayload,
  AdminCoinMintPayload,
} from '@/types/admin';
import {
  isUserForbidden,
  mapAdminUser,
  mapBattle,
  mapComment,
  mapForbiddenWord,
  mapMarket,
  mapOperateLog,
  mapReportToRiskAlert,
  mapTopic,
  mapTopicNode,
  mapUserReport,
  mapUserToBannedUser,
  normalizePageResult,
  toTrendPoints,
} from '@/utils/adminAdapters';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';

interface ManualRequestResult<TResult, TParams extends unknown[]> {
  run: (...args: TParams) => Promise<TResult>;
  data: TResult | undefined;
  loading: boolean;
  error: Error | undefined;
  refresh: () => Promise<TResult>;
}

interface QueryRequestResult<TResult> {
  data: TResult | undefined;
  loading: boolean;
  error: Error | undefined;
  refresh: () => Promise<TResult>;
}

function useAutoQueryRequest<TResult>(
  queryKey: unknown[],
  queryFn: () => Promise<TResult>,
): QueryRequestResult<TResult> {
  const query = useQuery<TResult, Error>({
    queryKey,
    queryFn,
  });

  return {
    data: query.data,
    loading: query.isLoading || query.isFetching,
    error: query.error ?? undefined,
    refresh: async () => {
      const result = await query.refetch();
      if (result.error) {
        throw result.error;
      }
      return result.data as TResult;
    },
  };
}

function useParamQueryRequest<TResult, TParams>(
  queryKeyFactory: (params: TParams) => unknown[],
  queryFn: (params: TParams) => Promise<TResult>,
  params: TParams,
): QueryRequestResult<TResult> {
  const query = useQuery<TResult, Error>({
    queryKey: queryKeyFactory(params),
    queryFn: () => queryFn(params),
  });

  return {
    data: query.data,
    loading: query.isLoading || query.isFetching,
    error: query.error ?? undefined,
    refresh: async () => {
      const result = await query.refetch();
      if (result.error) {
        throw result.error;
      }
      return result.data as TResult;
    },
  };
}

function useLazyQueryRequest<TResult, TParams>(
  queryKeyFactory: (params: TParams) => unknown[],
  queryFn: (params: TParams) => Promise<TResult>,
): ManualRequestResult<TResult, [TParams]> {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<TParams | undefined>();

  const query = useQuery<TResult, Error>({
    queryKey: params ? queryKeyFactory(params) : ['idle-query'],
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

function useVoidMutationRequest<TResult>(
  mutationKey: unknown[],
  mutationFn: () => Promise<TResult>,
): ManualRequestResult<TResult, []> {
  const mutation = useMutation<TResult, Error, void>({
    mutationKey,
    mutationFn: async () => mutationFn(),
  });

  return {
    run: async () => mutation.mutateAsync(),
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

function toPageQuery(params: PageParams) {
  return {
    page: params.current ?? 1,
    limit: params.pageSize ?? 20,
  };
}

function toFormData(payload: object) {
  const form = new URLSearchParams();

  Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      form.append(key, JSON.stringify(value));
      return;
    }

    form.append(key, String(value));
  });

  return form;
}

function createRequestId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function applyKeywordFilter<T>(
  items: T[],
  keyword: string | undefined,
  pickText: (item: T) => string,
) {
  const normalized = keyword?.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) => pickText(item).toLowerCase().includes(normalized));
}

function normalizeTagList(rawData: unknown): string[] {
  if (Array.isArray(rawData)) {
    return rawData
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }

        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return String(record.name ?? record.label ?? record.tag ?? '').trim();
        }

        return '';
      })
      .filter(Boolean);
  }

  if (rawData && typeof rawData === 'object') {
    const pageResult = normalizePageResult(rawData, (item) => {
      if (typeof item === 'string') {
        return item.trim();
      }

      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return String(record.name ?? record.label ?? record.tag ?? '').trim();
      }

      return '';
    });

    return pageResult.data.filter(Boolean);
  }

  return [];
}

async function requestDashboardStats() {
  const res = await axiosCustom<AdminDashboardStatsResponse>({
    method: 'get',
    cmd: API_ADMIN_DASHBOARD_STATS,
    headers: getAuthorizationHeaders(),
  });

  return assertSuccess(res);
}

async function requestPredictStats() {
  const res = await axiosCustom<AdminPredictStatsResponse>({
    method: 'get',
    cmd: API_ADMIN_PREDICT_STATS,
    headers: getAuthorizationHeaders(),
  });

  return assertSuccess(res);
}

async function requestPredictTrends(range: AdminRange = '7d'): Promise<TrendPoint[]> {
  const res = await axiosCustom<AdminTrendResponse>({
    method: 'get',
    cmd: API_ADMIN_PREDICT_TRENDS,
    params: { range },
    headers: getAuthorizationHeaders(),
  });

  return toTrendPoints(assertSuccess(res), 'count');
}

async function requestPredictActiveUsers(range: AdminRange = '7d'): Promise<TrendPoint[]> {
  const res = await axiosCustom<AdminTrendResponse>({
    method: 'get',
    cmd: API_ADMIN_PREDICT_ACTIVE_USERS,
    params: { range },
    headers: getAuthorizationHeaders(),
  });

  return toTrendPoints(assertSuccess(res), 'activeUserCount');
}

async function requestBattleTrends(range: AdminRange = '7d'): Promise<TrendPoint[]> {
  const res = await axiosCustom<AdminTrendResponse>({
    method: 'get',
    cmd: API_ADMIN_BATTLE_TRENDS,
    params: { range },
    headers: getAuthorizationHeaders(),
  });

  return toTrendPoints(assertSuccess(res), 'count');
}

async function requestBattleActiveUsers(range: AdminRange = '7d'): Promise<TrendPoint[]> {
  const res = await axiosCustom<AdminTrendResponse>({
    method: 'get',
    cmd: API_ADMIN_BATTLE_ACTIVE_USERS,
    params: { range },
    headers: getAuthorizationHeaders(),
  });

  return toTrendPoints(assertSuccess(res), 'activeUserCount');
}

async function requestPredictTags() {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_PREDICT_TAG_LIST,
    headers: getAuthorizationHeaders(),
  });

  return normalizeTagList(assertSuccess(res));
}

async function requestMarkets(
  params: PageParams & { status?: string },
): Promise<PageResult<AdminMarket>> {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_FOOTBALL_MARKETS,
    params: toPageQuery(params),
    headers: getAuthorizationHeaders(),
  });

  const pageResult = normalizePageResult(assertSuccess(res), mapMarket);
  let list = pageResult.data;

  if (params.status) {
    list = list.filter((item) => item.status === params.status);
  }

  list = applyKeywordFilter(
    list,
    params.keyword,
    (item) => `${item.title} ${item.tags.join(' ')}`,
  );

  return {
    data: list,
    total: list.length,
    success: true,
  };
}

async function requestPredictMarketStats(marketId: number) {
  const res = await axiosCustom<PredictMarketStatsResponse>({
    method: 'get',
    cmd: API_ADMIN_PREDICT_MARKET_STATS,
    params: { marketId },
    headers: getAuthorizationHeaders(),
  });

  return assertSuccess(res);
}

async function requestSettlePredictMarket(payload: PredictMarketSettlePayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_PREDICT_MARKET_SETTLE,
    data: {
      ...payload,
      requestId: payload.requestId || createRequestId('predict-settle'),
    },
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return assertSuccess(res);
}

async function requestRefreshPredictTags() {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_PREDICT_TAG_REFRESH,
    headers: getAuthorizationHeaders(),
  });

  return assertSuccess(res);
}

async function requestUpdatePredictContext(payload: PredictContextUpdatePayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_FOOTBALL_PREDICT_CONTEXT_UPDATE,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestBattles(
  params: PageParams & { status?: string },
): Promise<PageResult<AdminBattle>> {
  const backendStatusMap: Record<string, string | undefined> = {
    waiting: 'open',
    active: 'sealed',
    pending_declare: 'pending',
    disputed: 'disputed',
    resolved: 'settled',
    voided: 'settled',
  };

  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_BATTLE_LIST,
    params: {
      page: params.current ?? 1,
      pageSize: params.pageSize ?? 20,
      status: params.status ? backendStatusMap[params.status] : undefined,
    },
    headers: getAuthorizationHeaders(),
  });

  const pageResult = normalizePageResult(assertSuccess(res), mapBattle);
  const filteredByStatus = params.status
    ? pageResult.data.filter((item) => item.status === params.status)
    : pageResult.data;

  return {
    data: applyKeywordFilter(
      filteredByStatus,
      params.keyword,
      (item) => `${item.topic} ${item.creator.name}`,
    ),
    total: filteredByStatus.length,
    success: true,
  };
}

async function requestBattleStats() {
  const res = await axiosCustom<Record<string, unknown>>({
    method: 'get',
    cmd: API_BATTLE_STATS,
    headers: getAuthorizationHeaders(),
  });

  return assertSuccess(res);
}

async function requestResolveBattle(payload: BattleResolvePayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_BATTLE_RESOLVE,
    data: {
      ...payload,
      requestId: payload.requestId || createRequestId('battle-resolve'),
    },
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return assertSuccess(res);
}

async function requestTopics(
  params: PageParams & { reported?: boolean; recommend?: boolean; status?: number },
): Promise<PageResult<AdminTopic>> {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_TOPIC_LIST,
    params: {
      ...toPageQuery(params),
      title: params.keyword,
      recommend: params.recommend,
      status: params.status,
    },
    headers: getAuthorizationHeaders(),
  });

  const pageResult = normalizePageResult(assertSuccess(res), mapTopic);
  return {
    data: pageResult.data,
    total: pageResult.total,
    success: true,
  };
}

async function requestTopicBy(id: number) {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: getAdminTopicByPath(id),
    headers: getAuthorizationHeaders(),
  });

  return mapTopic(assertSuccess(res));
}

async function requestDeleteTopic(payload: TopicAdminActionPayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_TOPIC_DELETE,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestUndeleteTopic(payload: TopicAdminActionPayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_TOPIC_UNDELETE,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestAuditTopic(payload: TopicAdminActionPayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_TOPIC_AUDIT,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestToggleTopicRecommend(params: { id: number; enabled: boolean }) {
  const res = await axiosCustom<unknown>({
    method: params.enabled ? 'post' : 'delete',
    cmd: API_ADMIN_TOPIC_RECOMMEND,
    data: toFormData({ id: params.id }),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestToggleTopicSticky(payload: TopicStickyPayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: getTopicStickyPath(payload.topicId),
    data: toFormData({ sticky: payload.sticky }),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestComments(
  params: PageParams & {
    userId?: number;
    entityType?: string;
    entityId?: number;
    status?: number;
    id?: number;
  },
): Promise<PageResult<AdminCommentRecord>> {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_COMMENT_LIST,
    params: {
      ...toPageQuery(params),
      id: params.id,
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      status: params.status,
    },
    headers: getAuthorizationHeaders(),
  });

  return normalizePageResult(assertSuccess(res), mapComment);
}

async function requestDeleteComment(id: number) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: getAdminCommentDeletePath(id),
    headers: getAuthorizationHeaders(),
  });

  return assertSuccess(res);
}

async function requestForbiddenWords(
  params: PageParams & { type?: number; status?: number; word?: string } = {},
): Promise<PageResult<AdminForbiddenWordRecord>> {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_FORBIDDEN_WORD_LIST,
    params: {
      ...toPageQuery(params),
      type: params.type,
      status: params.status,
      word: params.word || params.keyword,
    },
    headers: getAuthorizationHeaders(),
  });

  return normalizePageResult(assertSuccess(res), mapForbiddenWord);
}

async function requestForbiddenWordBy(id: number) {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: getAdminForbiddenWordByPath(id),
    headers: getAuthorizationHeaders(),
  });

  return mapForbiddenWord(assertSuccess(res));
}

async function requestCreateForbiddenWord(payload: ForbiddenWordPayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_FORBIDDEN_WORD_CREATE,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestUpdateForbiddenWord(payload: ForbiddenWordPayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_FORBIDDEN_WORD_UPDATE,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestDeleteForbiddenWord(id: number) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_FORBIDDEN_WORD_DELETE,
    data: toFormData({ id }),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestUserReports(
  params: PageParams = {},
): Promise<PageResult<AdminUserReportRecord>> {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_USER_REPORT_LIST,
    params: toPageQuery(params),
    headers: getAuthorizationHeaders(),
  });

  return normalizePageResult(assertSuccess(res), mapUserReport);
}

async function requestUserReportBy(id: number) {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: getAdminUserReportByPath(id),
    headers: getAuthorizationHeaders(),
  });

  return mapUserReport(assertSuccess(res));
}

async function requestUpdateUserReport(payload: UserReportUpdatePayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_USER_REPORT_UPDATE,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestUsers(
  params: PageParams & {
    id?: number;
    nickname?: string;
    email?: string;
    username?: string;
    type?: number;
  } = {},
): Promise<PageResult<AdminUserRecord>> {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_USER_LIST,
    params: {
      ...toPageQuery(params),
      id: params.id,
      nickname: params.nickname || params.keyword,
      email: params.email,
      username: params.username,
      type: params.type,
    },
    headers: getAuthorizationHeaders(),
  });

  return normalizePageResult(assertSuccess(res), mapAdminUser);
}

async function requestGrantAdmin(payload: UserGrantAdminPayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_USER_GRANT_ADMIN,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestRevokeAdmin(payload: UserGrantAdminPayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_USER_REVOKE_ADMIN,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestMintCoins(payload: AdminCoinMintPayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_COIN_MINT,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestForbiddenUser(payload: UserForbiddenPayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_USER_FORBIDDEN,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestTopicNodes(
  params: PageParams & { name?: string } = {},
): Promise<PageResult<AdminTopicNodeRecord>> {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_TOPIC_NODE_LIST,
    params: {
      name: params.name || params.keyword,
    },
    headers: getAuthorizationHeaders(),
  });

  return normalizePageResult(assertSuccess(res), mapTopicNode);
}

async function requestTopicNodeBy(id: number) {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: getAdminTopicNodeByPath(id),
    headers: getAuthorizationHeaders(),
  });

  return mapTopicNode(assertSuccess(res));
}

async function requestTopicNodeTree() {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_TOPIC_NODE_NODES,
    headers: getAuthorizationHeaders(),
  });

  return normalizePageResult(assertSuccess(res), mapTopicNode).data;
}

async function requestCreateTopicNode(payload: TopicNodePayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_TOPIC_NODE_CREATE,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestUpdateTopicNode(payload: TopicNodePayload) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_TOPIC_NODE_UPDATE,
    data: toFormData(payload),
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return assertSuccess(res);
}

async function requestUpdateTopicNodeSort(ids: number[]) {
  const res = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_TOPIC_NODE_UPDATE_SORT,
    data: ids,
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return assertSuccess(res);
}

async function requestOperationLogs(params: PageParams): Promise<PageResult<OpLog>> {
  const res = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_OPERATE_LOG_LIST,
    params: toPageQuery(params),
    headers: getAuthorizationHeaders(),
  });

  const pageResult = normalizePageResult(assertSuccess(res), mapOperateLog);
  return {
    data: applyKeywordFilter(
      pageResult.data,
      params.keyword,
      (item) => `${item.operator} ${item.detail} ${item.targetId}`,
    ),
    total: pageResult.total,
    success: true,
  };
}

async function requestFundRecords(params: PageParams): Promise<PageResult<FundRecord>> {
  const filtered = applyKeywordFilter(
    fundRecords,
    params.keyword,
    (item) => `${item.userName} ${item.remark}`,
  );

  return {
    data: filtered,
    total: filtered.length,
    success: true,
  };
}

async function requestRiskOverview(): Promise<{
  alerts: RiskAlert[];
  bannedUsers: BannedUser[];
}> {
  const [reports, users] = await Promise.all([
    requestUserReports({ current: 1, pageSize: 100 }),
    requestUsers({ current: 1, pageSize: 100 }),
  ]);

  return {
    alerts: reports.data.map(mapReportToRiskAlert),
    bannedUsers: users.data
      .filter((item) => isUserForbidden(item.raw))
      .map(mapUserToBannedUser),
  };
}

async function requestPenaltyRules() {
  return PENALTY_RULES;
}

export function useRequestDashboardStats() {
  return useAutoQueryRequest(['requestDashboardStats'], requestDashboardStats);
}

export function useRequestPredictStats() {
  return useAutoQueryRequest(['requestPredictStats'], requestPredictStats);
}

export function useRequestPredictTrends(range: AdminRange = '7d') {
  return useParamQueryRequest(
    (params: AdminRange) => ['requestPredictTrends', params],
    requestPredictTrends,
    range,
  );
}

export function useRequestPredictActiveUsers(range: AdminRange = '7d') {
  return useParamQueryRequest(
    (params: AdminRange) => ['requestPredictActiveUsers', params],
    requestPredictActiveUsers,
    range,
  );
}

export function useRequestBattleTrends(range: AdminRange = '7d') {
  return useParamQueryRequest(
    (params: AdminRange) => ['requestBattleTrends', params],
    requestBattleTrends,
    range,
  );
}

export function useRequestBattleActiveUsers(range: AdminRange = '7d') {
  return useParamQueryRequest(
    (params: AdminRange) => ['requestBattleActiveUsers', params],
    requestBattleActiveUsers,
    range,
  );
}

export function useRequestPredictTags() {
  return useAutoQueryRequest(['requestPredictTags'], requestPredictTags);
}

export function useRequestMarkets() {
  return useLazyQueryRequest(
    (params: Parameters<typeof requestMarkets>[0]) => ['requestMarkets', params],
    requestMarkets,
  );
}

export function useRequestPredictMarketStats() {
  return useLazyQueryRequest(
    (marketId: number) => ['requestPredictMarketStats', marketId],
    requestPredictMarketStats,
  );
}

export function useRequestSettlePredictMarket() {
  return useMutationRequest(
    ['requestSettlePredictMarket'],
    requestSettlePredictMarket,
  );
}

export function useRequestRefreshPredictTags() {
  return useVoidMutationRequest(['requestRefreshPredictTags'], requestRefreshPredictTags);
}

export function useRequestUpdatePredictContext() {
  return useMutationRequest(['requestUpdatePredictContext'], requestUpdatePredictContext);
}

export function useRequestBattles() {
  return useLazyQueryRequest(
    (params: Parameters<typeof requestBattles>[0]) => ['requestBattles', params],
    requestBattles,
  );
}

export function useRequestBattleStats() {
  return useAutoQueryRequest(['requestBattleStats'], requestBattleStats);
}

export function useRequestResolveBattle() {
  return useMutationRequest(['requestResolveBattle'], requestResolveBattle);
}

export function useRequestTopics() {
  return useLazyQueryRequest(
    (params: Parameters<typeof requestTopics>[0]) => ['requestTopics', params],
    requestTopics,
  );
}

export function useRequestTopicBy() {
  return useLazyQueryRequest(
    (id: number) => ['requestTopicBy', id],
    requestTopicBy,
  );
}

export function useRequestDeleteTopic() {
  return useMutationRequest(['requestDeleteTopic'], requestDeleteTopic);
}

export function useRequestUndeleteTopic() {
  return useMutationRequest(['requestUndeleteTopic'], requestUndeleteTopic);
}

export function useRequestAuditTopic() {
  return useMutationRequest(['requestAuditTopic'], requestAuditTopic);
}

export function useRequestToggleTopicRecommend() {
  return useMutationRequest(
    ['requestToggleTopicRecommend'],
    requestToggleTopicRecommend,
  );
}

export function useRequestToggleTopicSticky() {
  return useMutationRequest(['requestToggleTopicSticky'], requestToggleTopicSticky);
}

export function useRequestComments() {
  return useLazyQueryRequest(
    (params: Parameters<typeof requestComments>[0]) => ['requestComments', params],
    requestComments,
  );
}

export function useRequestForbiddenWords() {
  return useLazyQueryRequest(
    (params: Parameters<typeof requestForbiddenWords>[0]) => ['requestForbiddenWords', params],
    requestForbiddenWords,
  );
}

export function useRequestForbiddenWordBy() {
  return useLazyQueryRequest(
    (id: number) => ['requestForbiddenWordBy', id],
    requestForbiddenWordBy,
  );
}

export function useRequestCreateForbiddenWord() {
  return useMutationRequest(['requestCreateForbiddenWord'], requestCreateForbiddenWord);
}

export function useRequestUpdateForbiddenWord() {
  return useMutationRequest(['requestUpdateForbiddenWord'], requestUpdateForbiddenWord);
}

export function useRequestDeleteForbiddenWord() {
  return useMutationRequest(['requestDeleteForbiddenWord'], requestDeleteForbiddenWord);
}

export function useRequestUserReports() {
  return useLazyQueryRequest(
    (params: Parameters<typeof requestUserReports>[0] = {}) => ['requestUserReports', params],
    requestUserReports,
  ) as ManualRequestResult<PageResult<AdminUserReportRecord>, [Parameters<typeof requestUserReports>[0]?]>;
}

export function useRequestUserReportBy() {
  return useLazyQueryRequest(
    (id: number) => ['requestUserReportBy', id],
    requestUserReportBy,
  );
}

export function useRequestUpdateUserReport() {
  return useMutationRequest(['requestUpdateUserReport'], requestUpdateUserReport);
}

export function useRequestUsers() {
  return useLazyQueryRequest(
    (params: Parameters<typeof requestUsers>[0] = {}) => ['requestUsers', params],
    requestUsers,
  ) as ManualRequestResult<PageResult<AdminUserRecord>, [Parameters<typeof requestUsers>[0]?]>;
}

export function useRequestGrantAdmin() {
  return useMutationRequest(['requestGrantAdmin'], requestGrantAdmin);
}

export function useRequestRevokeAdmin() {
  return useMutationRequest(['requestRevokeAdmin'], requestRevokeAdmin);
}

export function useRequestMintCoins() {
  return useMutationRequest(['requestMintCoins'], requestMintCoins);
}

export function useRequestForbiddenUser() {
  return useMutationRequest(['requestForbiddenUser'], requestForbiddenUser);
}

export function useRequestTopicNodes() {
  return useLazyQueryRequest(
    (params: Parameters<typeof requestTopicNodes>[0] = {}) => ['requestTopicNodes', params],
    requestTopicNodes,
  ) as ManualRequestResult<PageResult<AdminTopicNodeRecord>, [Parameters<typeof requestTopicNodes>[0]?]>;
}

export function useRequestTopicNodeBy() {
  return useLazyQueryRequest(
    (id: number) => ['requestTopicNodeBy', id],
    requestTopicNodeBy,
  );
}

export function useRequestTopicNodeTree() {
  return useAutoQueryRequest(['requestTopicNodeTree'], requestTopicNodeTree) as QueryRequestResult<
    AdminTopicNodeRecord[]
  >;
}

export function useRequestCreateTopicNode() {
  return useMutationRequest(['requestCreateTopicNode'], requestCreateTopicNode);
}

export function useRequestUpdateTopicNode() {
  return useMutationRequest(['requestUpdateTopicNode'], requestUpdateTopicNode);
}

export function useRequestUpdateTopicNodeSort() {
  return useMutationRequest(['requestUpdateTopicNodeSort'], requestUpdateTopicNodeSort);
}

export function useRequestOperationLogs() {
  return useLazyQueryRequest(
    (params: Parameters<typeof requestOperationLogs>[0]) => ['requestOperationLogs', params],
    requestOperationLogs,
  );
}

export function useRequestRecentOperationLogs(
  params: Parameters<typeof requestOperationLogs>[0] = { current: 1, pageSize: 5 },
) {
  return useParamQueryRequest(
    (nextParams: Parameters<typeof requestOperationLogs>[0]) => ['requestRecentOperationLogs', nextParams],
    requestOperationLogs,
    params,
  );
}

export function useRequestFundRecords() {
  return useLazyQueryRequest(
    (params: Parameters<typeof requestFundRecords>[0]) => ['requestFundRecords', params],
    requestFundRecords,
  );
}

export function useRequestRiskOverview() {
  return useAutoQueryRequest(['requestRiskOverview'], requestRiskOverview) as QueryRequestResult<{
    alerts: RiskAlert[];
    bannedUsers: BannedUser[];
  }>;
}

export function useRequestDashboardUserReports(
  params: Parameters<typeof requestUserReports>[0] = { current: 1, pageSize: 100 },
) {
  return useParamQueryRequest(
    (nextParams: Parameters<typeof requestUserReports>[0]) => ['requestDashboardUserReports', nextParams],
    requestUserReports,
    params,
  );
}

export function useRequestPenaltyRules() {
  return useAutoQueryRequest(['requestPenaltyRules'], requestPenaltyRules) as QueryRequestResult<
    { violation: string; result: string; penalty: string; color: 'red' | 'amber' | 'blue' }[]
  >;
}

export function useRequestDeleteComment() {
  return useMutationRequest(['requestDeleteComment'], requestDeleteComment);
}
