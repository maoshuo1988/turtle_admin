import type {
  AdminPkRound,
  AdminPkRoundRow,
  AdminPkSeason,
  AdminPkSeasonRow,
  AdminPkStats,
  AdminPkTopic,
  AdminPkTopicRow,
} from '@/types/adminPk';
import type { PageResult } from '@/types/http';

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): AnyRecord {
  return isRecord(value) ? value : {};
}

function firstValue(source: AnyRecord, keys: string[]) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  return undefined;
}

function pickNumber(source: AnyRecord, ...keys: string[]) {
  const value = firstValue(source, keys);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function pickString(source: AnyRecord, ...keys: string[]) {
  const value = firstValue(source, keys);
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

function formatTimestamp(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && !/^\d+$/.test(value)) return value;

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;

  const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1000;
  return new Date(milliseconds).toLocaleString();
}

function pickRecord(source: AnyRecord, ...keys: string[]) {
  const value = firstValue(source, keys);
  return asRecord(value);
}

function extractListPayload(raw: unknown) {
  const record = asRecord(raw);
  const list = firstValue(record, ['list', 'data', 'items', 'records']);
  const total = firstValue(record, ['count', 'total']);

  return {
    list: Array.isArray(list) ? list : Array.isArray(raw) ? raw : [],
    total: pickNumber({ total }, 'total') ?? (Array.isArray(list) ? list.length : 0),
  };
}

export function mapAdminPkTopic(raw: unknown): AdminPkTopic {
  const record = asRecord(raw);
  const sideA = pickRecord(record, 'sideA', 'side_a');
  const sideB = pickRecord(record, 'sideB', 'side_b');

  return {
    id: pickNumber(record, 'id', 'topicId', 'topic_id') ?? 0,
    slug: pickString(record, 'slug') ?? '',
    title: pickString(record, 'title', 'name') ?? '',
    sideAName: pickString(record, 'sideAName', 'side_a_name') ?? pickString(sideA, 'name') ?? '',
    sideBName: pickString(record, 'sideBName', 'side_b_name') ?? pickString(sideB, 'name') ?? '',
    status: pickString(record, 'status') === 'disabled' ? 'disabled' : 'enabled',
    sort: pickNumber(record, 'sort', 'sortNo', 'sort_no'),
    cover: pickString(record, 'cover', 'coverUrl', 'cover_url'),
    raw: record,
  };
}

export function mapAdminPkRound(raw: unknown): AdminPkRound {
  const record = asRecord(raw);
  const winner = pickString(record, 'winner') || undefined;

  return {
    id: pickNumber(record, 'id', 'roundId', 'round_id') ?? 0,
    topicId: pickNumber(record, 'topicId', 'topic_id') ?? 0,
    seasonId: pickNumber(record, 'seasonId', 'season_id'),
    phase: pickString(record, 'phase') as AdminPkRound['phase'],
    roundNo: pickNumber(record, 'roundNo', 'round_no', 'no'),
    heatA: pickNumber(record, 'heatA', 'heat_a'),
    heatB: pickNumber(record, 'heatB', 'heat_b'),
    poolA: pickNumber(record, 'poolA', 'pool_a', 'stakeA', 'stake_a'),
    poolB: pickNumber(record, 'poolB', 'pool_b', 'stakeB', 'stake_b'),
    userCountA: pickNumber(record, 'userCountA', 'user_count_a', 'betUserA', 'bet_user_a'),
    userCountB: pickNumber(record, 'userCountB', 'user_count_b', 'betUserB', 'bet_user_b'),
    winner: winner === 'A' || winner === 'B' || winner === 'draw' ? winner : undefined,
    startTime: formatTimestamp(firstValue(record, ['startTime', 'start_time'])),
    endTime: formatTimestamp(firstValue(record, ['endTime', 'end_time'])),
    settledAt: formatTimestamp(firstValue(record, ['settledAt', 'settled_at', 'settleTime', 'settle_time'])),
    raw: record,
  };
}

export function mapAdminPkSeason(raw: unknown): AdminPkSeason {
  const record = asRecord(raw);

  return {
    id: pickNumber(record, 'id', 'seasonId', 'season_id') ?? 0,
    topicId: pickNumber(record, 'topicId', 'topic_id') ?? 0,
    seasonNo: pickNumber(record, 'seasonNo', 'season_no', 'no'),
    status: pickString(record, 'status') as AdminPkSeason['status'],
    startTime: formatTimestamp(firstValue(record, ['startTime', 'start_time'])),
    endTime: formatTimestamp(firstValue(record, ['endTime', 'end_time'])),
    raw: record,
  };
}

function mapStats(raw: unknown): AdminPkStats {
  const record = asRecord(raw);
  return {
    totalRounds: pickNumber(record, 'totalRounds', 'total_rounds') ?? 0,
    winsA: pickNumber(record, 'winsA', 'wins_a') ?? 0,
    winsB: pickNumber(record, 'winsB', 'wins_b') ?? 0,
  };
}

export function mapAdminPkTopicRow(raw: unknown): AdminPkTopicRow {
  const record = asRecord(raw);
  return {
    topic: mapAdminPkTopic(firstValue(record, ['topic']) ?? record),
    round: isRecord(record.round) ? mapAdminPkRound(record.round) : undefined,
    season: isRecord(record.season) ? mapAdminPkSeason(record.season) : undefined,
    stats: mapStats(record.stats),
  };
}

export function mapAdminPkRoundRow(raw: unknown): AdminPkRoundRow {
  const record = asRecord(raw);
  return {
    round: mapAdminPkRound(firstValue(record, ['round']) ?? record),
    topic: isRecord(record.topic) ? mapAdminPkTopic(record.topic) : undefined,
  };
}

export function mapAdminPkSeasonRow(raw: unknown): AdminPkSeasonRow {
  const record = asRecord(raw);
  return {
    season: mapAdminPkSeason(firstValue(record, ['season']) ?? record),
    topic: isRecord(record.topic) ? mapAdminPkTopic(record.topic) : undefined,
  };
}

export function normalizeAdminPkPageResult<T>(
  raw: unknown,
  mapper: (item: unknown) => T,
): PageResult<T> {
  const payload = extractListPayload(raw);
  return {
    data: payload.list.map(mapper),
    total: payload.total,
    success: true,
  };
}
