export interface TagBrief {
  id: number;
  name: string;
  description?: string;
  raw?: Record<string, unknown>;
}

export interface TagCreatePayload {
  name: string;
  description?: string;
}

export interface TagCreateResponse {
  id: number;
  name: string;
}

export interface TagCommentStatRow {
  tagId: number;
  tagName: string;
  commentCount: number;
}

export interface TagListParams {
  page?: number;
  limit?: number;
  keyword?: string;
}

export interface TagPageResult<T> {
  results: T[];
  page: number;
  limit: number;
  total: number;
}
