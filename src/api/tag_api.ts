export const API_TAG_CREATE = '/api/tag/create';
export const API_TAG_TAGS = '/api/tag/tags';
export const API_TAG_AUTOCOMPLETE = '/api/tag/autocomplete';
export const API_TAG_COMMENT_STATS = '/api/tag/comment_stats';

export function getTagByPath(tagId: number | string) {
  return `/api/tag/${encodeURIComponent(String(tagId))}`;
}
