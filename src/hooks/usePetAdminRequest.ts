import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useState } from 'react';
import {
  API_ADMIN_PET_DEFS,
  API_ADMIN_PET_FEATURES,
  API_ADMIN_PET_GACHA_CONFIG,
  API_ADMIN_PET_GACHA_CONFIG_RESET,
  API_ADMIN_PET_KILL_SWITCH,
  getAdminPetAbilitiesPath,
  getAdminPetAbilityPath,
  getAdminPetDefinitionPath,
  getAdminPetFeaturePath,
} from '@/api/admin_api';
import { axiosCustom } from '@/api/axios';
import type {
  DeletePetAbilityPayload,
  FeatureCatalogItem,
  FeatureCatalogListParams,
  GachaPoolConfig,
  PetDefinition,
  PetDefinitionListParams,
  PetKillSwitchPayload,
  ReplacePetAbilitiesPayload,
  SavePetAbilityPayload,
} from '@/types/pet';
import { normalizePageResult } from '@/utils/adminAdapters';
import {
  mapFeatureCatalogItem,
  mapGachaPoolConfig,
  mapPetDefinition,
} from '@/utils/petAdminAdapters';
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
    queryKey: params ? queryKeyFactory(params) : ['pet-idle-query'],
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

function toPetPageQuery(params: { current?: number; pageSize?: number }) {
  return {
    page: params.current ?? 1,
    size: params.pageSize ?? 20,
  };
}

function matchesPetKeyword(pet: PetDefinition, keyword: string | undefined) {
  const normalized = keyword?.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const searchable = [
    pet.pet_id,
    pet.name['zh-CN'],
    pet.name['en-US'],
    pet.description?.['zh-CN'],
    pet.description?.['en-US'],
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchable.includes(normalized);
}

async function requestPetDefinitions(
  params: PetDefinitionListParams = {},
) {
  const response = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_PET_DEFS,
    params: {
      ...toPetPageQuery(params),
      enabled: params.enabled,
      rarity: params.rarity,
    },
    headers: getAuthorizationHeaders(),
  });

  const pageResult = normalizePageResult(assertSuccess(response), mapPetDefinition);
  const filtered = pageResult.data.filter((item) => matchesPetKeyword(item, params.keyword));

  return {
    data: filtered,
    total: params.keyword ? filtered.length : pageResult.total,
    success: true,
  };
}

async function requestPetDefinitionBy(petDefinitionId: string) {
  const response = await axiosCustom<unknown>({
    method: 'get',
    cmd: getAdminPetDefinitionPath(petDefinitionId),
    headers: getAuthorizationHeaders(),
  });

  return mapPetDefinition(assertSuccess(response));
}

async function requestSavePetDefinition(payload: Omit<PetDefinition, 'raw' | 'id'>) {
  const response = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_PET_DEFS,
    data: payload,
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return assertSuccess(response);
}

async function requestDeletePetDefinition(petDefinitionId: string) {
  const response = await axiosCustom<unknown>({
    method: 'delete',
    cmd: getAdminPetDefinitionPath(petDefinitionId),
    headers: getAuthorizationHeaders(),
  });

  return assertSuccess(response);
}

async function requestPetFeatures(
  params: FeatureCatalogListParams = {},
) {
  const response = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_PET_FEATURES,
    params: {
      ...toPetPageQuery(params),
      enabled: params.enabled,
      scope: params.scope,
      q: params.q || params.keyword,
    },
    headers: getAuthorizationHeaders(),
  });

  return normalizePageResult(assertSuccess(response), mapFeatureCatalogItem);
}

async function requestPetFeatureBy(featureKey: string) {
  const response = await axiosCustom<unknown>({
    method: 'get',
    cmd: getAdminPetFeaturePath(featureKey),
    headers: getAuthorizationHeaders(),
  });

  return mapFeatureCatalogItem(assertSuccess(response));
}

async function requestSavePetFeature(payload: Omit<FeatureCatalogItem, 'raw'>) {
  const response = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_PET_FEATURES,
    data: payload,
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return assertSuccess(response);
}

async function requestDeletePetFeature(featureKey: string) {
  const response = await axiosCustom<unknown>({
    method: 'delete',
    cmd: getAdminPetFeaturePath(featureKey),
    headers: getAuthorizationHeaders(),
  });

  return assertSuccess(response);
}

async function requestReplacePetAbilities(payload: ReplacePetAbilitiesPayload) {
  const response = await axiosCustom<unknown>({
    method: 'put',
    cmd: getAdminPetAbilitiesPath(payload.petDefinitionId),
    data: { abilities: payload.abilities },
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return mapPetDefinition(assertSuccess(response));
}

async function requestSavePetAbility(payload: SavePetAbilityPayload) {
  const response = await axiosCustom<unknown>({
    method: 'patch',
    cmd: getAdminPetAbilityPath(payload.petDefinitionId, payload.featureKey),
    data: {
      params: payload.params,
    },
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return mapPetDefinition(assertSuccess(response));
}

async function requestDeletePetAbility(payload: DeletePetAbilityPayload) {
  const response = await axiosCustom<unknown>({
    method: 'delete',
    cmd: getAdminPetAbilityPath(payload.petDefinitionId, payload.featureKey),
    headers: getAuthorizationHeaders(),
  });

  return assertSuccess(response);
}

async function requestPetKillSwitch(payload: PetKillSwitchPayload) {
  const response = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_PET_KILL_SWITCH,
    data: payload,
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return assertSuccess(response);
}

async function requestPetGachaConfig() {
  const response = await axiosCustom<unknown>({
    method: 'get',
    cmd: API_ADMIN_PET_GACHA_CONFIG,
    headers: getAuthorizationHeaders(),
  });

  return mapGachaPoolConfig(assertSuccess(response));
}

async function requestSavePetGachaConfig(payload: GachaPoolConfig) {
  const response = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_PET_GACHA_CONFIG,
    data: payload,
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return mapGachaPoolConfig(assertSuccess(response));
}

async function requestResetPetGachaConfig() {
  const response = await axiosCustom<unknown>({
    method: 'post',
    cmd: API_ADMIN_PET_GACHA_CONFIG_RESET,
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
  });

  return mapGachaPoolConfig(assertSuccess(response));
}

export function useRequestPetDefinitions() {
  return useLazyQueryRequest(
    (params: PetDefinitionListParams) => ['requestPetDefinitions', params],
    requestPetDefinitions,
  );
}

export function useRequestPetDefinitionBy() {
  return useLazyQueryRequest(
    (petDefinitionId: string) => ['requestPetDefinitionBy', petDefinitionId],
    requestPetDefinitionBy,
  );
}

export function useRequestSavePetDefinition() {
  return useMutationRequest(['requestSavePetDefinition'], requestSavePetDefinition);
}

export function useRequestDeletePetDefinition() {
  return useMutationRequest(['requestDeletePetDefinition'], requestDeletePetDefinition);
}

export function useRequestPetFeatures() {
  return useLazyQueryRequest(
    (params: FeatureCatalogListParams) => ['requestPetFeatures', params],
    requestPetFeatures,
  );
}

export function useRequestPetFeatureBy() {
  return useLazyQueryRequest(
    (featureKey: string) => ['requestPetFeatureBy', featureKey],
    requestPetFeatureBy,
  );
}

export function useRequestSavePetFeature() {
  return useMutationRequest(['requestSavePetFeature'], requestSavePetFeature);
}

export function useRequestDeletePetFeature() {
  return useMutationRequest(['requestDeletePetFeature'], requestDeletePetFeature);
}

export function useRequestReplacePetAbilities() {
  return useMutationRequest(['requestReplacePetAbilities'], requestReplacePetAbilities);
}

export function useRequestSavePetAbility() {
  return useMutationRequest(['requestSavePetAbility'], requestSavePetAbility);
}

export function useRequestDeletePetAbility() {
  return useMutationRequest(['requestDeletePetAbility'], requestDeletePetAbility);
}

export function useRequestPetKillSwitch() {
  return useMutationRequest(['requestPetKillSwitch'], requestPetKillSwitch);
}

export function useRequestPetGachaConfig() {
  return useLazyQueryRequest(
    () => ['requestPetGachaConfig'],
    () => requestPetGachaConfig(),
  );
}

export function useRequestSavePetGachaConfig() {
  return useMutationRequest(['requestSavePetGachaConfig'], requestSavePetGachaConfig);
}

export function useRequestResetPetGachaConfig() {
  return useMutationRequest(['requestResetPetGachaConfig'], requestResetPetGachaConfig);
}
