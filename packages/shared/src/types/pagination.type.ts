export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface PaginatedResponse<T> {
  readonly data: T[];
  readonly meta: PaginationMeta;
}

export interface PaginationQuery {
  readonly page?: number;
  readonly limit?: number;
}
