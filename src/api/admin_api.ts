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

export const API_ADMIN_TOPIC_LIST = '/api/admin/topic/list';
export const API_ADMIN_TOPIC_BY = '/api/admin/topic/by';
export const API_ADMIN_TOPIC_DELETE = '/api/admin/topic/delete';
export const API_ADMIN_TOPIC_UNDELETE = '/api/admin/topic/undelete';
export const API_ADMIN_TOPIC_AUDIT = '/api/admin/topic/audit';
export const API_ADMIN_TOPIC_RECOMMEND = '/api/admin/topic/recommend';
export const API_TOPIC_STICKY = '/api/topic/sticky';

export const API_ADMIN_COMMENT_LIST = '/api/admin/comment/list';
export const API_ADMIN_COMMENT_DELETE = '/api/admin/comment/delete';

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

export const API_ADMIN_USER_REPORT_LIST = '/api/admin/user-report/list';
export const API_ADMIN_USER_REPORT_BY = '/api/admin/user-report/by';
export const API_ADMIN_USER_REPORT_UPDATE = '/api/admin/user-report/update';

export const API_ADMIN_USER_LIST = '/api/admin/user/list';
export const API_ADMIN_USER_GRANT_ADMIN = '/api/admin/user/grant_admin';
export const API_ADMIN_USER_REVOKE_ADMIN = '/api/admin/user/revoke_admin';

export const API_ADMIN_COIN_MINT = '/api/admin/coin/mint';
export const API_USER_FORBIDDEN = '/api/user/forbidden';

export const API_ADMIN_OPERATE_LOG_LIST = '/api/admin/operate-log/list';

export function getAdminTopicByPath(id: number | string) {
  return `${API_ADMIN_TOPIC_BY}/${id}`;
}

export function getTopicStickyPath(topicId: number | string) {
  return `${API_TOPIC_STICKY}/${topicId}`;
}

export function getAdminCommentDeletePath(id: number | string) {
  return `${API_ADMIN_COMMENT_DELETE}/${id}`;
}

export function getAdminPetDefinitionPath(petId: string) {
  return `${API_ADMIN_PET_DEFS}/${encodeURIComponent(petId)}`;
}

export function getAdminPetAbilitiesPath(petId: string) {
  return `${getAdminPetDefinitionPath(petId)}/abilities`;
}

export function getAdminPetAbilityPath(petId: string, featureKey: string) {
  return `${getAdminPetAbilitiesPath(petId)}/${encodeURIComponent(featureKey)}`;
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

export function getAdminUserReportByPath(id: number | string) {
  return `${API_ADMIN_USER_REPORT_BY}/${id}`;
}
