import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { REFRESH_TOKEN_BYTES } from "./auth.constants";
import { SessionStore } from "./session-store.interface";

// Rotasi wajib + deteksi reuse (TDD §8.1, acceptance task 0.6). Refresh token
// opaque (bukan JWT) berformat `${userId}.${sessionId}.${secret}` — userId
// dan sessionId dipakai langsung sebagai key lookup SessionStore
// (`session:{user_id}:{session_id}`, TDD §12), secret di-hash (SHA-256)
// sebelum dibandingkan/disimpan (token asli tidak pernah persis di storage).
//
// Algoritma reuse detection: SessionStore hanya menyimpan hash SECRET
// TERKINI per sesi (bukan histori). Kalau secret yang dipresentasikan tidak
// cocok dengan hash tersimpan PADAHAL sesi masih ada di store, itu berarti
// token lama (sudah di-rotate sebelumnya) sedang direplay — indikasi
// pencurian token (TDD §8.1) → revoke SELURUH sesi user, bukan cuma sesi ini.

export interface RotateResult {
  refreshToken: string;
  userId: string;
  tenantId: string;
  sessionId: string;
}

// Dibedakan dari UnauthorizedException biasa supaya caller (AuthService) bisa
// men-trigger audit trail DB (user_sessions.revoked_reason =
// TOKEN_REUSE_DETECTED) tanpa string-matching pesan error.
export class RefreshTokenReuseDetectedException extends UnauthorizedException {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
  ) {
    super("Refresh token reuse terdeteksi — seluruh sesi telah di-revoke.");
  }
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function generateSecret(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");
}

function formatToken(userId: string, sessionId: string, secret: string): string {
  return `${userId}.${sessionId}.${secret}`;
}

function parseToken(token: string): { userId: string; sessionId: string; secret: string } {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
    throw new UnauthorizedException("Refresh token tidak valid.");
  }
  const [userId, sessionId, secret] = parts;
  return { userId, sessionId, secret };
}

@Injectable()
export class RefreshTokenService {
  constructor(private readonly sessionStore: SessionStore) {}

  /** Dipanggil saat sesi baru dibuat (login sukses / token-exchange awal). */
  async issue(userId: string, tenantId: string, sessionId: string, ttlSeconds: number): Promise<string> {
    const secret = generateSecret();
    await this.sessionStore.set(userId, sessionId, { tenantId, currentSecretHash: hashSecret(secret) }, ttlSeconds);
    return formatToken(userId, sessionId, secret);
  }

  /**
   * Rotasi: refresh token lama langsung invalid, refresh token baru
   * dikembalikan. `resolveTtlSeconds` menerima tenantId SETELAH sesi
   * ditemukan (baru di titik itu tenant diketahui) — dipakai caller untuk
   * membaca PasswordPolicy.sessionTimeoutMinutes tanpa perlu fetch sesi dua
   * kali.
   */
  async rotate(
    presentedToken: string,
    resolveTtlSeconds: (tenantId: string) => Promise<number>,
  ): Promise<RotateResult> {
    const { userId, sessionId, secret } = parseToken(presentedToken);

    const record = await this.sessionStore.get(userId, sessionId);
    if (!record) {
      // Sesi sudah tidak ada (revoked/expired) — fail closed, tidak ada yang
      // bisa di-cascade-revoke karena memang sudah tidak ada state aktif.
      throw new UnauthorizedException("Sesi tidak ditemukan atau sudah revoked.");
    }

    if (hashSecret(secret) !== record.currentSecretHash) {
      // REUSE TERDETEKSI — token ini sudah tidak jadi "current" untuk sesi
      // yang masih hidup, artinya sedang direplay. Revoke total.
      const tenantId = record.tenantId;
      await this.sessionStore.deleteAllForUser(userId);
      throw new RefreshTokenReuseDetectedException(userId, tenantId);
    }

    const ttlSeconds = await resolveTtlSeconds(record.tenantId);
    const newSecret = generateSecret();
    await this.sessionStore.set(
      userId,
      sessionId,
      { tenantId: record.tenantId, currentSecretHash: hashSecret(newSecret) },
      ttlSeconds,
    );

    return {
      refreshToken: formatToken(userId, sessionId, newSecret),
      userId,
      tenantId: record.tenantId,
      sessionId,
    };
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.sessionStore.delete(userId, sessionId);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessionStore.deleteAllForUser(userId);
  }

  /** Dipakai jwt-auth.guard untuk cek keberadaan sesi (revocation langsung). */
  async isSessionAlive(userId: string, sessionId: string): Promise<boolean> {
    return (await this.sessionStore.get(userId, sessionId)) !== null;
  }
}
