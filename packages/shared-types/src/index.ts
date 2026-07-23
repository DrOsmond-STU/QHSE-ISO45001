// Tipe dasar dipakai bareng apps/api & apps/web.
// Mengikuti konvensi API TDD §7.1 (format response sukses/error).

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

// RFC 7807 Problem Details (TDD §7.1 — Format error)
export interface ApiErrorResponse {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Array<{ field: string; message: string }>;
}
