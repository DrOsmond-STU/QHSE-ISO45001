import type { ApiErrorResponse, ApiSuccessResponse } from "@qhse/shared-types";

// Task 1.7 — client API PERTAMA di apps/web (0.1-1.6 semua belum menyentuh
// apps/web sama sekali kecuali placeholder design-system, task 0.14 app
// shell BELUM dikerjakan). BELUM ADA halaman login di apps/web MANA PUN
// (diverifikasi: tidak ada task apa pun di TASK_INSTRUCTION.md yang
// membangunnya) — token diasumsikan sudah ada di sessionStorage lewat
// jalur LAIN (dev: diisi manual/lewat browser devtools; produksi:
// menunggu task login UI yang belum ada nomornya, gap TDD §26). Modul ini
// TIDAK mencoba auto-refresh token kadaluwarsa (0.6 py alur PKCE
// login->token, refresh token httpOnly cookie terpisah — refresh
// otomatis di luar scope minimal task ini, gap TDD §26) — 401 diteruskan
// apa adanya ke caller (halaman) utk ditampilkan sbg state
// "belum masuk", bukan di-retry diam-diam.

const ACCESS_TOKEN_KEY = "qhse.accessToken";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ApiErrorResponse | null,
  ) {
    super(problem?.detail ?? problem?.title ?? `Permintaan API gagal (HTTP ${status}).`);
    this.name = "ApiError";
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildQueryString(query?: ApiFetchOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * `credentials: "include"` — refresh token httpOnly cookie (0.6) ikut
 * terkirim lintas origin web(3000)<->api(3001) saat dev, mirror
 * `WEB_ORIGIN`/CORS `credentials:true` sisi server (main.ts). Access
 * token dari sessionStorage dipasang sbg Bearer header — pola SPA
 * standar (bukan cookie, krn access token TIDAK httpOnly di alur 0.6).
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${getApiBaseUrl()}${path}${buildQueryString(options.query)}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ApiError(response.status, problem);
  }

  const payload = (await response.json()) as ApiSuccessResponse<T>;
  return payload.data;
}

/** Varian yang JUGA mengembalikan `meta` (pagination) — `apiFetch()` biasa membuang `meta`. */
export async function apiFetchWithMeta<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<{ data: T; meta?: ApiSuccessResponse<T>["meta"] }> {
  const token = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${getApiBaseUrl()}${path}${buildQueryString(options.query)}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ApiError(response.status, problem);
  }

  return (await response.json()) as ApiSuccessResponse<T>;
}
