import type {
  AdminBattle,
  AdminMarket,
  AdminTopic,
  BannedUser,
  FundRecord,
  OpLog,
  RiskAlert,
  TrendPoint,
} from '@/data/admin_mock_data';
import type {
  AdminCommentRecord,
  AdminForbiddenWordRecord,
  AdminTopicNodeRecord,
  AdminUserRecord,
  AdminUserReportRecord,
} from '@/types/admin';
import type { PageResult } from '@/types/http';

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstValue(source: AnyRecord, keys: string[]) {
  for (const key of keys) {
    if (key in source && source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  return undefined;
}

function asRecord(value: unknown): AnyRecord | undefined {
  return isRecord(value) ? value : undefined;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    return value === 'true' || value === '1';
  }

  return fallback;
}

function pickNumber(source: AnyRecord, ...keys: string[]) {
  return toNumber(firstValue(source, keys));
}

function pickString(source: AnyRecord, ...keys: string[]) {
  return toString(firstValue(source, keys));
}

function pickBoolean(source: AnyRecord, ...keys: string[]) {
  return toBoolean(firstValue(source, keys));
}

function pickRecord(source: AnyRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (isRecord(value)) {
      return value;
    }
  }

  return undefined;
}

function pickArray(source: AnyRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeTimestamp(value: unknown) {
  const numeric = toNumber(value);
  if (!numeric) {
    return 0;
  }

  return numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
}

function formatTimestamp(value: unknown) {
  const timestamp = normalizeTimestamp(value);
  if (!timestamp) {
    return '-';
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function parseTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      if (isRecord(item)) {
        return pickString(item, 'name', 'label', 'tag');
      }

      return '';
    }).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\s#]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function normalizePageResult<T>(
  rawData: unknown,
  mapper: (item: unknown) => T,
): PageResult<T> {
  if (Array.isArray(rawData)) {
    return {
      data: rawData.map(mapper),
      total: rawData.length,
      success: true,
    };
  }

  const record = asRecord(rawData);
  if (!record) {
    return {
      data: [],
      total: 0,
      success: true,
    };
  }

  const page = pickRecord(record, 'page', 'Page');
  const list =
    pickArray(record, 'list', 'rows', 'results', 'items', 'data', 'Results', 'records') ||
    pickArray(page ?? {}, 'list', 'rows', 'results', 'items', 'data', 'Results', 'records');
  return {
    data: list.map(mapper),
    total:
      pickNumber(record, 'total', 'count', 'totalCount', 'Total') ||
      pickNumber(page ?? {}, 'total', 'count', 'totalCount', 'Total') ||
      list.length,
    success: true,
  };
}

export function toTrendPoints(rawData: unknown, valueKey: 'count' | 'activeUserCount'): TrendPoint[] {
  const list = isRecord(rawData) ? pickArray(rawData, 'list', 'data', 'items') : [];

  return list.map((item) => {
    const record = asRecord(item) ?? {};
    return {
      date: pickString(record, 'day', 'date'),
      value: pickNumber(record, valueKey, 'value'),
    };
  });
}

export function mapMarket(item: unknown): AdminMarket {
  const record = asRecord(item) ?? {};
  const market = pickRecord(record, 'market') ?? record;
  const context = pickRecord(record, 'context') ?? record;
  const tags = parseTags(firstValue(context, ['tags']));
  const poolA = pickNumber(market, 'poolA');
  const poolB = pickNumber(market, 'poolB');
  const proVoteCount = pickNumber(context, 'proVoteCount');
  const conVoteCount = pickNumber(context, 'conVoteCount');
  const result = pickString(market, 'result').toUpperCase();

  return {
    id: pickNumber(market, 'id'),
    title: pickString(context, 'eventName', 'title') || pickString(market, 'title') || '未命名市场',
    proText: pickString(context, 'proText') || '正方',
    conText: pickString(context, 'conText') || '反方',
    status: (pickString(market, 'status').toUpperCase() as AdminMarket['status']) || 'OPEN',
    poolA,
    poolB,
    baseA: pickNumber(market, 'baseA'),
    baseB: pickNumber(market, 'baseB'),
    betCount: pickNumber(context, 'participantCount', 'betCount') || proVoteCount + conVoteCount,
    closeTime: normalizeTimestamp(firstValue(market, ['closeTime', 'settleTime'])),
    createTime: normalizeTimestamp(firstValue(market, ['createTime'])),
    source: pickString(market, 'sourceModel', 'source') || 'manual',
    isPinned: pickBoolean(context, 'sticky', 'isPinned', 'pinned'),
    isRecommended: pickBoolean(context, 'recommend', 'isRecommended'),
    tags,
    heat: pickNumber(context, 'heat'),
    outcome: result === 'A' || result === 'B' ? result : result === 'VOID' ? 'VOID' : null,
    settledBy: pickString(market, 'resolvedBy', 'settledBy'),
    settleReason: pickString(market, 'remark', 'settleReason'),
  };
}

export function mapBattle(item: unknown): AdminBattle {
  const record = asRecord(item) ?? {};
  const battle = pickRecord(record, 'battle') ?? record;
  const status = pickString(battle, 'status');
  const result = pickString(battle, 'result');
  const challengerName =
    pickString(record, 'challengerNickname', 'challengerName') ||
    pickString(battle, 'challengerNickname', 'challengerName');

  let mappedStatus: AdminBattle['status'] = 'waiting';
  if (status === 'sealed') mappedStatus = 'active';
  if (status === 'pending') mappedStatus = 'pending_declare';
  if (status === 'disputed') mappedStatus = 'disputed';
  if (status === 'settled') mappedStatus = result === 'void' ? 'voided' : 'resolved';

  return {
    id: String(pickNumber(battle, 'id')),
    topic: pickString(battle, 'title') || '未命名对局',
    optionA: pickString(battle, 'bankerSide') || '庄家观点',
    optionB: pickString(battle, 'challengerSide') || '挑战者观点',
    creator: {
      name: pickString(record, 'bankerNickname') || '庄家',
      avatar: '⚔️',
      side: 'A',
    },
    challenger: challengerName
      ? {
          name: challengerName,
          avatar: '🛡️',
          side: 'B',
        }
      : null,
    wager: pickNumber(battle, 'poolPrincipalTotal', 'bankerStakeTotal'),
    status: mappedStatus,
    winner:
      result === 'banker_wins'
        ? 'A'
        : result === 'banker_loses'
          ? 'B'
          : null,
    createdTime: formatTimestamp(firstValue(battle, ['createTime'])),
    disputeReason: pickString(battle, 'remark', 'disputeReason'),
    disputeDeadline: formatTimestamp(firstValue(battle, ['disputeDeadline'])),
    resolveReason: pickString(battle, 'remark', 'resolveReason'),
    resolvedBy: pickString(battle, 'resultBy', 'resolvedBy'),
    pendingDeadline: formatTimestamp(firstValue(battle, ['pendingDeadline', 'confirmDeadline'])),
  };
}

export function mapTopic(item: unknown): AdminTopic {
  const record = asRecord(item) ?? {};
  const user = pickRecord(record, 'user') ?? {};
  const node = pickRecord(record, 'node') ?? {};
  const tags = parseTags(firstValue(record, ['tags']));
  const images = pickArray(record, 'imageList');

  return {
    id: String(firstValue(record, ['id']) ?? ''),
    title: pickString(record, 'title') || '未命名帖子',
    content: pickString(record, 'summary', 'content'),
    user: {
      nickname: pickString(user, 'nickname', 'username') || '匿名用户',
      username: pickString(user, 'username'),
      avatar: pickString(user, 'avatar') || '📝',
    },
    node: {
      id: pickNumber(node, 'id'),
      name: pickString(node, 'name') || '未分类',
    },
    tags,
    viewCount: pickNumber(record, 'viewCount'),
    commentCount: pickNumber(record, 'commentCount'),
    likeCount: pickNumber(record, 'likeCount'),
    sticky: pickBoolean(record, 'sticky'),
    recommend: pickBoolean(record, 'recommend'),
    createTime: formatTimestamp(firstValue(record, ['createTime'])),
    ipLocation: pickString(record, 'ipLocation') || '-',
    reported: false,
    imageCount: images.length,
  };
}

export function mapReportToRiskAlert(item: unknown): RiskAlert {
  const report = mapUserReport(item);
  const status = report.auditStatus;
  const handled = status !== 0;

  return {
    id: String(report.id),
    type: 'report',
    level: handled ? 'low' : 'medium',
    title: `${report.dataType || '内容'} 举报`,
    detail: report.reason || '待审核举报',
    userName: report.userName,
    targetId: String(report.dataId),
    time: formatTimestamp(report.createTime || report.auditTime),
    handled,
    handledBy: report.auditUserName,
  };
}

export function mapOperateLog(item: unknown): OpLog {
  const record = asRecord(item) ?? {};
  const description = pickString(record, 'description', 'detail', 'content');
  const dataType = pickString(record, 'dataType', 'targetType');
  const opType = pickString(record, 'opType', 'action').toLowerCase();

  let action: OpLog['action'] = 'edit_context';
  if (dataType.includes('battle')) action = 'resolve_battle';
  if (dataType.includes('predict') && description.includes('settle')) action = 'settle_market';
  if (dataType.includes('predict') && description.includes('void')) action = 'void_market';
  if (description.includes('grant') || description.includes('revoke')) action = 'ban_user';
  if (description.includes('recommend')) action = 'recommend_topic';
  if (description.includes('sticky')) action = 'sticky_topic';
  if (description.includes('delete')) action = 'delete_topic';
  if (description.includes('mint')) action = 'admin_mint';
  if (opType.includes('update') && dataType.includes('predict')) action = 'edit_context';

  return {
    id: String(firstValue(record, ['id']) ?? ''),
    operator: pickString(record, 'userName', 'operator', 'opUserName') || '系统',
    role: pickString(record, 'role') || '管理员',
    action,
    targetType: dataType || '-',
    targetId: String(firstValue(record, ['dataId', 'targetId']) ?? '-'),
    detail: description || '-',
    ip: pickString(record, 'ip') || '-',
    time: formatTimestamp(firstValue(record, ['createTime', 'time'])),
  };
}

export function mapFundRecord(item: unknown): FundRecord {
  const record = asRecord(item) ?? {};
  return {
    id: pickNumber(record, 'id'),
    userId: pickNumber(record, 'userId'),
    userName: pickString(record, 'userName', 'nickname') || '未知用户',
    bizType: pickString(record, 'bizType', 'type') || 'unknown',
    amount: pickNumber(record, 'amount'),
    balanceAfter: pickNumber(record, 'balanceAfter', 'balance'),
    remark: pickString(record, 'remark', 'description'),
    createTime: formatTimestamp(firstValue(record, ['createTime'])),
  };
}

export function mapUserToBannedUser(item: unknown): BannedUser {
  const user = mapAdminUser(item);
  const endTime = user.forbiddenEndTime;

  return {
    userId: String(user.id),
    name: user.nickname || user.username || '未知用户',
    avatar: user.avatar || '🚫',
    reason: user.forbiddenReason || '已禁言用户',
    bannedAt: formatTimestamp(endTime),
    bannedBy: '管理员',
    expiresAt: endTime ? formatTimestamp(endTime) : (user.forbiddenDays && user.forbiddenDays < 0 ? '永久' : null),
    totalBets: 0,
  };
}

export function mapUserReport(item: unknown): AdminUserReportRecord {
  const record = asRecord(item) ?? {};
  return {
    id: pickNumber(record, 'id'),
    dataType: pickString(record, 'dataType'),
    dataId: pickNumber(record, 'dataId'),
    reason: pickString(record, 'reason'),
    auditStatus: pickNumber(record, 'auditStatus', 'status'),
    auditRemark: pickString(record, 'auditRemark'),
    createTime: pickNumber(record, 'createTime'),
    auditTime: pickNumber(record, 'auditTime'),
    userName: pickString(record, 'userName', 'nickname'),
    auditUserName: pickString(record, 'auditUserName'),
    raw: record,
  };
}

export function mapForbiddenWord(item: unknown): AdminForbiddenWordRecord {
  const record = asRecord(item) ?? {};
  return {
    id: pickNumber(record, 'id'),
    type: pickNumber(record, 'type'),
    word: pickString(record, 'word'),
    status: pickNumber(record, 'status'),
    createTime: pickNumber(record, 'createTime'),
    raw: record,
  };
}

export function mapTopicNode(item: unknown): AdminTopicNodeRecord {
  const record = asRecord(item) ?? {};
  return {
    id: pickNumber(record, 'id'),
    name: pickString(record, 'name') || '未命名节点',
    description: pickString(record, 'description'),
    logo: pickString(record, 'logo'),
    status: pickNumber(record, 'status'),
    sortNo: pickNumber(record, 'sortNo', 'sort'),
    raw: record,
  };
}

export function mapComment(item: unknown): AdminCommentRecord {
  const record = asRecord(item) ?? {};
  const user = pickRecord(record, 'user') ?? {};
  return {
    id: pickNumber(record, 'id'),
    userId: pickNumber(record, 'userId'),
    entityType: pickString(record, 'entityType'),
    entityId: pickNumber(record, 'entityId'),
    status: pickNumber(record, 'status'),
    content: pickString(record, 'content'),
    userName: pickString(user, 'nickname', 'username') || pickString(record, 'userName'),
    createTime: pickNumber(record, 'createTime'),
    raw: record,
  };
}

export function mapAdminUser(item: unknown): AdminUserRecord {
  const record = asRecord(item) ?? {};
  return {
    id: pickNumber(record, 'id'),
    nickname: pickString(record, 'nickname'),
    username: pickString(record, 'username'),
    email: pickString(record, 'email'),
    avatar: pickString(record, 'avatar'),
    type: pickNumber(record, 'type'),
    forbiddenDays: pickNumber(record, 'forbiddenDays', 'muteDays'),
    forbiddenEndTime: pickNumber(record, 'forbiddenEndTime', 'muteEndTime'),
    forbiddenReason: pickString(record, 'forbiddenReason', 'muteReason'),
    raw: record,
  };
}

export function isUserForbidden(item: unknown) {
  const user = mapAdminUser(item);
  const days = user.forbiddenDays ?? 0;
  const status = pickNumber(user.raw, 'status');
  return days !== 0 || status === -1 || status === 2;
}
