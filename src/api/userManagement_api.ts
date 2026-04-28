export const API_USER_MANAGEMENT_TOPIC_LIST = '/api/admin/topic/list';
export const API_USER_MANAGEMENT_TOPIC_BY = '/api/admin/topic/by';
export const API_USER_MANAGEMENT_TOPIC_DELETE = '/api/admin/topic/delete';
export const API_USER_MANAGEMENT_TOPIC_UNDELETE = '/api/admin/topic/undelete';
export const API_USER_MANAGEMENT_TOPIC_AUDIT = '/api/admin/topic/audit';
export const API_USER_MANAGEMENT_TOPIC_RECOMMEND = '/api/admin/topic/recommend';
export const API_USER_MANAGEMENT_TOPIC_STICKY = '/api/topic/sticky';

export const API_USER_MANAGEMENT_COMMENT_LIST = '/api/admin/comment/list';
export const API_USER_MANAGEMENT_COMMENT_DELETE = '/api/admin/comment/delete';

export const API_USER_MANAGEMENT_REPORT_LIST = '/api/admin/user-report/list';
export const API_USER_MANAGEMENT_REPORT_BY = '/api/admin/user-report/by';
export const API_USER_MANAGEMENT_REPORT_UPDATE = '/api/admin/user-report/update';

export const API_USER_MANAGEMENT_USER_LIST = '/api/admin/user/list';
export const API_USER_MANAGEMENT_USER_GRANT_ADMIN = '/api/admin/user/grant_admin';
export const API_USER_MANAGEMENT_USER_REVOKE_ADMIN = '/api/admin/user/revoke_admin';
export const API_USER_MANAGEMENT_COIN_MINT = '/api/admin/coin/mint';
export const API_USER_MANAGEMENT_USER_FORBIDDEN = '/api/user/forbidden';

export const API_USER_MANAGEMENT_OPERATE_LOG_LIST = '/api/admin/operate-log/list';

export function getUserManagementTopicByPath(id: number | string) {
  return `${API_USER_MANAGEMENT_TOPIC_BY}/${id}`;
}

export function getUserManagementTopicStickyPath(topicId: number | string) {
  return `${API_USER_MANAGEMENT_TOPIC_STICKY}/${topicId}`;
}

export function getUserManagementCommentDeletePath(id: number | string) {
  return `${API_USER_MANAGEMENT_COMMENT_DELETE}/${id}`;
}

export function getUserManagementReportByPath(id: number | string) {
  return `${API_USER_MANAGEMENT_REPORT_BY}/${id}`;
}
