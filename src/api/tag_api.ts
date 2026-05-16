export const API_TAG_CREATE = '/api/admin/tag/create';
export const API_TAG_TAGS = '/api/admin/tag/tags';
export const API_TAG_AUTOCOMPLETE = '/api/admin/tag/autocomplete';
export const API_TAG_COMMENT_STATS = '/api/admin/tag/comment_stats';

export function getTagByPath(tagId: number | string) {
  return `/api/admin/tag/${encodeURIComponent(String(tagId))}`;
}
