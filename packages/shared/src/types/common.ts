export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  cursor?: string;
}

export interface Address {
  addressLine1: string;
  addressLine2?: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  country?: string;
}
