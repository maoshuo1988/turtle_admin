export interface PredictTagRecord {
  id: number;
  slug: string;
  name: string;
  cnName: string;
  lastSeenAt?: number;
  createTime?: number;
  updateTime?: number;
  marketCount: number;
}

export interface PredictTagListParams {
  current?: number;
  pageSize?: number;
  q?: string;
  slugs?: string;
  sort?: 'marketCount' | 'updateTime';
  includeCounts?: boolean;
}

export interface PredictTagPageResult {
  data: PredictTagRecord[];
  total: number;
  page: number;
  pageSize: number;
  success: boolean;
}
