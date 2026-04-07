export type AdminRange = '7d' | '14d' | '30d';

export interface AdminDashboardStatsResponse {
  totalUsers: number;
  totalComments: number;
  totalTopics: number;
}

export interface AdminPredictStatsResponse {
  openCount: number;
  closedCount: number;
  settledCount: number;
  todayNewMarkets: number;
  todayBetAmount: number;
  todayFee: number;
  todayBurn: number;
}

export interface AdminTrendItem {
  day: string;
  count?: number;
  activeUserCount?: number;
}

export interface AdminTrendResponse {
  range: string;
  days: number;
  list: AdminTrendItem[];
}

export interface PredictMarketStatsResponse {
  marketId: number;
  status: string;
  result?: string;
  closeTime?: number;
  resolved?: boolean;
  resolvedAt?: number;
  proUserCount: number;
  conUserCount: number;
  proAmount: number;
  conAmount: number;
  totalAmount: number;
  totalBetCount: number;
}

export interface PredictMarketSettlePayload {
  marketId: number;
  result: 'A' | 'B';
  requestId: string;
  remark?: string;
  allowReset?: boolean;
}

export interface PredictContextUpdatePayload {
  marketId: number;
  eventName: string;
  imageUrl?: string;
  participantCount?: number;
  proText?: string;
  conText?: string;
  proVoteCount?: number;
  conVoteCount?: number;
  heat?: number;
  detail?: string;
  tags?: string;
}

export interface BattleResolvePayload {
  battleId: number;
  requestId: string;
  result: 'banker_wins' | 'banker_loses' | 'void';
  remark?: string;
}

export interface TopicAdminActionPayload {
  id: number;
}

export interface TopicStickyPayload {
  topicId: number;
  sticky: boolean;
}

export interface UserReportUpdatePayload {
  id: number;
  auditStatus: number;
  auditRemark?: string;
  auditUserId?: number;
  auditTime?: number;
}

export interface AdminUserReportRecord {
  id: number;
  dataType: string;
  dataId: number;
  reason: string;
  auditStatus: number;
  auditRemark?: string;
  createTime?: number;
  auditTime?: number;
  userName?: string;
  auditUserName?: string;
  raw: Record<string, unknown>;
}

export interface AdminForbiddenWordRecord {
  id: number;
  type: number;
  word: string;
  status: number;
  createTime?: number;
  raw: Record<string, unknown>;
}

export interface AdminTopicNodeRecord {
  id: number;
  name: string;
  description?: string;
  logo?: string;
  status?: number;
  sortNo?: number;
  raw: Record<string, unknown>;
}

export interface AdminCommentRecord {
  id: number;
  userId: number;
  entityType: string;
  entityId: number;
  status?: number;
  content: string;
  userName?: string;
  createTime?: number;
  raw: Record<string, unknown>;
}

export interface AdminUserRecord {
  id: number;
  nickname?: string;
  username?: string;
  email?: string;
  avatar?: string;
  type?: number;
  forbiddenDays?: number;
  forbiddenEndTime?: number;
  forbiddenReason?: string;
  raw: Record<string, unknown>;
}

export interface UserGrantAdminPayload {
  userId: number;
}

export interface UserForbiddenPayload {
  userId: number;
  days: number;
  reason?: string;
}

export interface AdminCoinMintPayload {
  userId: number;
  amount: number;
  remark?: string;
}

export interface ForbiddenWordPayload {
  id?: number;
  type?: number;
  word?: string;
  status?: number;
}

export interface TopicNodePayload {
  id?: number;
  name?: string;
  description?: string;
  logo?: string;
  status?: number;
}
