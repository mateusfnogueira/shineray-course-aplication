export interface ApiSuccessResponse<T = void> {
  readonly success: true;
  readonly data: T;
  readonly message?: string;
}

export interface ApiErrorResponse {
  readonly success: false;
  readonly message: string;
  readonly errors?: Record<string, string[]>;
  readonly statusCode: number;
}

export type ApiResponse<T = void> = ApiSuccessResponse<T> | ApiErrorResponse;
