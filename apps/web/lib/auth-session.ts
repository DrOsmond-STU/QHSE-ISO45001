"use client";

import { ApiError, apiFetch, clearAccessToken, getAccessToken, setAccessToken } from "./api-client";
import { generatePkcePair } from "./pkce";

// Alur login lengkap sisi browser, mengikuti Authorization Code + PKCE
// (TDD §8.1) persis seperti yang diimplementasikan auth.controller.ts:
//
//   1. POST /auth/login  (header x-tenant-id + codeChallenge) -> { code }
//   2. POST /auth/token  (grantType=authorization_code + codeVerifier)
//                        -> { accessToken } + Set-Cookie refresh_token
//                           (httpOnly, path=/auth/token)
//
// Access token disimpan di sessionStorage (api-client.ts) — BUKAN cookie,
// karena di alur 0.6 access token memang tidak httpOnly; refresh token yang
// sensitif itulah yang httpOnly dan tidak pernah tersentuh JavaScript.
//
// tenantId + email disimpan di localStorage supaya form login tidak perlu
// diketik ulang tiap kali. Keduanya BUKAN kredensial — tenantId itu
// pengenal organisasi yang memang dikirim sebagai header biasa, dan
// password TIDAK PERNAH disimpan di mana pun.

const TENANT_ID_KEY = "qhse.tenantId";
const EMAIL_KEY = "qhse.email";

export const MFA_REQUIRED = "MFA_REQUIRED";

export interface LoginInput {
  tenantId: string;
  email: string;
  password: string;
  totpCode?: string;
}

interface AuthorizationCodeResponse {
  code: string;
  state?: string;
}

interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

/** Dilempar saat server balas 401 "MFA_REQUIRED" — form perlu menampilkan kolom TOTP. */
export class MfaRequiredError extends Error {
  constructor() {
    super(MFA_REQUIRED);
    this.name = "MfaRequiredError";
  }
}

function isMfaRequired(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 401) return false;
  return JSON.stringify(error.problem ?? {}).includes(MFA_REQUIRED);
}

export async function login({ tenantId, email, password, totpCode }: LoginInput): Promise<void> {
  const { codeVerifier, codeChallenge } = await generatePkcePair();

  let authorization: AuthorizationCodeResponse;
  try {
    authorization = await apiFetch<AuthorizationCodeResponse>("/auth/login", {
      method: "POST",
      headers: { "x-tenant-id": tenantId },
      body: { email, password, codeChallenge, codeChallengeMethod: "S256", ...(totpCode ? { totpCode } : {}) },
    });
  } catch (error) {
    if (isMfaRequired(error)) throw new MfaRequiredError();
    throw error;
  }

  const token = await apiFetch<TokenResponse>("/auth/token", {
    method: "POST",
    body: { grantType: "authorization_code", code: authorization.code, codeVerifier },
  });

  setAccessToken(token.accessToken);
  window.localStorage.setItem(TENANT_ID_KEY, tenantId);
  window.localStorage.setItem(EMAIL_KEY, email);
}

/**
 * Best-effort: kalau POST /auth/logout gagal (token sudah kedaluwarsa,
 * server tidak terjangkau) sesi lokal TETAP dibersihkan — user yang menekan
 * "Keluar" harus selalu benar-benar keluar dari sisi browser.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // sengaja diabaikan, lihat komentar di atas
  } finally {
    clearAccessToken();
  }
}

export interface SessionInfo {
  userId: string;
  tenantId: string;
  /**
   * Klaim `scope_roles` JWT. PERINGATAN (diverifikasi terhadap
   * platform/auth/auth.service.ts): saat ini server SELALU mengisinya array
   * kosong — resolusi peran/permission sepenuhnya server-side (task 0.8
   * RBAC Engine), tidak pernah dititipkan ke token. Jadi JANGAN pakai
   * field ini untuk menampilkan "peran user" di UI: hasilnya akan selalu
   * kosong dan pembaca menyimpulkan user tidak punya peran sama sekali,
   * padahal tidak.
   */
  roles: string[];
  sessionId: string;
  expiresAt: Date;
  email: string | null;
}

/**
 * Membaca klaim dari access token TANPA memverifikasi tanda tangannya —
 * ini SAH untuk keperluan tampilan saja (menampilkan nama peran di topbar,
 * memutuskan kapan menyuruh login ulang). Otorisasi yang sebenarnya tetap
 * sepenuhnya di server (JwtAuthGuard + PermissionGuard + EntitlementGuard):
 * klaim yang dipalsukan di browser tidak membuka data apa pun.
 */
export function readSession(): SessionInfo | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      sub?: string;
      tenant_id?: string;
      scope_roles?: string[];
      sid?: string;
      exp?: number;
    };
    if (!json.sub || !json.tenant_id) return null;
    return {
      userId: json.sub,
      tenantId: json.tenant_id,
      roles: json.scope_roles ?? [],
      sessionId: json.sid ?? "",
      expiresAt: new Date((json.exp ?? 0) * 1000),
      email: typeof window === "undefined" ? null : window.localStorage.getItem(EMAIL_KEY),
    };
  } catch {
    return null;
  }
}

export function getRememberedTenantId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TENANT_ID_KEY) ?? process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? "";
}

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(EMAIL_KEY) ?? "";
}
