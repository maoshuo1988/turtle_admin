export interface ApiResponse<T> {
  success: boolean;
  data: T;
  errorCode?: string;
  errorMessage?: string;
}

export interface PageParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
}

export interface PageResult<T> {
  data: T[];
  total: number;
  success: boolean;
}
