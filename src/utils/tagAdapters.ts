import type { TagBrief, TagCommentStatRow } from '@/types/tag';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pickNumber(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function pickString(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

export function mapTagBrief(item: unknown): TagBrief {
  const record = asRecord(item);
  return {
    id: pickNumber(record, 'id') ?? 0,
    name: pickString(record, 'name') ?? '',
    description: pickString(record, 'description'),
    raw: record,
  };
}

export function mapTagCommentStatRow(item: unknown): TagCommentStatRow {
  const record = asRecord(item);
  return {
    tagId: pickNumber(record, 'tagId', 'tag_id') ?? 0,
    tagName: pickString(record, 'tagName', 'tag_name') ?? '',
    commentCount: pickNumber(record, 'commentCount', 'comment_count') ?? 0,
  };
}

/** Normalizes `{ results, total, page, limit }`-style payloads from tag APIs. */
export function extractTagPagedResults<T>(
  raw: unknown,
  mapItem: (item: unknown) => T,
): { results: T[]; total: number; page: number; limit: number } {
  const record = asRecord(raw);
  const listRaw = record.results ?? record.list ?? record.data ?? record.items ?? [];
  const list = Array.isArray(listRaw) ? listRaw : [];

  return {
    results: list.map(mapItem),
    total: pickNumber(record, 'total', 'count') ?? list.length,
    page: pickNumber(record, 'page', 'current') ?? 1,
    limit: pickNumber(record, 'limit', 'pageSize', 'page_size') ?? 20,
  };
}
