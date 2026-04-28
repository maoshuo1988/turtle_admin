export const API_ADMIN_DASHBOARD_STATS = '/api/admin/dashboard/stats';

export const API_ADMIN_PREDICT_STATS = '/api/admin/predict/stats';
export const API_ADMIN_PREDICT_TRENDS = '/api/admin/predict/trends';
export const API_ADMIN_PREDICT_ACTIVE_USERS = '/api/admin/predict/active_users';
export const API_ADMIN_PREDICT_MARKET_STATS = '/api/admin/predict/market/stats';
export const API_ADMIN_PREDICT_MARKET_SETTLE = '/api/admin/predict/market/settle';

export const API_FOOTBALL_MARKETS = '/api/football/markets';
export const API_FOOTBALL_PREDICT_CONTEXT_UPDATE = '/api/football/predict_context/update';

export const API_PREDICT_TAG_LIST = '/api/predict-tag/list';
export const API_PREDICT_TAG_REFRESH = '/api/predict-tag/refresh';

export const API_BATTLE_LIST = '/api/battle/list';
export const API_BATTLE_STATS = '/api/battle/stats';
export const API_ADMIN_BATTLE_TRENDS = '/api/admin/battle/trends';
export const API_ADMIN_BATTLE_ACTIVE_USERS = '/api/admin/battle/active_users';
export const API_ADMIN_BATTLE_RESOLVE = '/api/admin/battle/resolve';

export const API_ADMIN_PET_DEFS = '/api/admin/pet/defs';
export const API_ADMIN_PET_KILL_SWITCH = '/api/admin/pet/kill-switch';
export const API_ADMIN_PET_FEATURES = '/api/admin/pet/features';
export const API_ADMIN_PET_GACHA_CONFIG = '/api/admin/pet/gacha/config';
export const API_ADMIN_PET_GACHA_CONFIG_RESET = '/api/admin/pet/gacha/config/reset';

export const API_ADMIN_TOPIC_NODE_LIST = '/api/admin/topic-node/list';
export const API_ADMIN_TOPIC_NODE_BY = '/api/admin/topic-node/by';
export const API_ADMIN_TOPIC_NODE_CREATE = '/api/admin/topic-node/create';
export const API_ADMIN_TOPIC_NODE_UPDATE = '/api/admin/topic-node/update';
export const API_ADMIN_TOPIC_NODE_NODES = '/api/admin/topic-node/nodes';
export const API_ADMIN_TOPIC_NODE_UPDATE_SORT = '/api/admin/topic-node/update_sort';

export const API_ADMIN_FORBIDDEN_WORD_LIST = '/api/admin/forbidden-word/list';
export const API_ADMIN_FORBIDDEN_WORD_BY = '/api/admin/forbidden-word/by';
export const API_ADMIN_FORBIDDEN_WORD_CREATE = '/api/admin/forbidden-word/create';
export const API_ADMIN_FORBIDDEN_WORD_UPDATE = '/api/admin/forbidden-word/update';
export const API_ADMIN_FORBIDDEN_WORD_DELETE = '/api/admin/forbidden-word/delete';

export function getAdminPetDefinitionPath(petDefinitionId: string) {
  return `${API_ADMIN_PET_DEFS}/${encodeURIComponent(petDefinitionId)}`;
}

export function getAdminPetAbilitiesPath(petDefinitionId: string) {
  return `${getAdminPetDefinitionPath(petDefinitionId)}/abilities`;
}

export function getAdminPetAbilityPath(petDefinitionId: string, featureKey: string) {
  return `${getAdminPetAbilitiesPath(petDefinitionId)}/${encodeURIComponent(featureKey)}`;
}

export function getAdminPetFeaturePath(featureKey: string) {
  return `${API_ADMIN_PET_FEATURES}/${encodeURIComponent(featureKey)}`;
}

export function getAdminTopicNodeByPath(id: number | string) {
  return `${API_ADMIN_TOPIC_NODE_BY}/${id}`;
}

export function getAdminForbiddenWordByPath(id: number | string) {
  return `${API_ADMIN_FORBIDDEN_WORD_BY}/${id}`;
}
