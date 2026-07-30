import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { AUTH_CODE_TTL_SECONDS } from "./auth.constants";
import { RedisProvider } from "./redis.provider";

// Auth code Authorization Code Flow + PKCE (TDD §8.1) — umur pendek (60
// detik), sekali pakai, terikat ke code_challenge yang di-set client saat
// /auth/login. Redis-backed (`authcode:{code}`).
// sessionId SENGAJA tidak ada di sini — sesi (Redis + baris user_sessions)
// baru dibuat saat token-exchange (grant authorization_code), bukan saat
// login/issue code. Kalau code tidak pernah ditukar (flow ditinggal), tidak
// ada sesi hantu yang tertinggal.
export interface AuthCodeRecord {
  userId: string;
  tenantId: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

@Injectable()
export class AuthorizationCodeService {
  constructor(private readonly redis: RedisProvider) {}

  async issue(record: AuthCodeRecord): Promise<string> {
    const code = randomBytes(32).toString("base64url");
    await this.redis.client.set(`authcode:${code}`, JSON.stringify(record), "EX", AUTH_CODE_TTL_SECONDS);
    return code;
  }

  /**
   * Konsumsi sekali pakai. Redis 5.0.14 (portable Windows build dipakai dev
   * lokal) belum punya GETDEL (baru ada sejak Redis 6.2) — dipakai GET+DEL
   * manual. Race window ini diterima untuk auth code berumur 60 detik
   * (bukan secret jangka panjang seperti refresh token).
   */
  async consume(code: string): Promise<AuthCodeRecord | null> {
    const key = `authcode:${code}`;
    const raw = await this.redis.client.get(key);
    if (!raw) {
      return null;
    }
    await this.redis.client.del(key);
    return JSON.parse(raw) as AuthCodeRecord;
  }
}
