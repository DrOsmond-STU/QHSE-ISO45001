import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { AUTH_CODE_TTL_SECONDS } from "./auth.constants";
import { isRedisEnabled } from "../scheduling/redis-enabled.helper";
import { RedisProvider } from "./redis.provider";

// Auth code Authorization Code Flow + PKCE (TDD §8.1) — umur pendek (60
// detik), sekali pakai, terikat ke code_challenge yang di-set client saat
// /auth/login. Redis-backed (`authcode:{code}`) SECARA DEFAULT, atau
// authorization_code_entries (Postgres) kalau REDIS_ENABLED=false —
// shared-hosting adaptation, lihat banner comment AuthorizationCodeEntry
// di schema.prisma. TIDAK diekstrak jadi interface terpisah (beda dari
// SessionStore/PermissionCache) — class ini tidak dibutuhkan diuji unit
// tanpa Redis di tempat lain, jadi branch internal cukup.
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
export class AuthorizationCodeService implements OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor(private readonly redis: RedisProvider) {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async issue(record: AuthCodeRecord): Promise<string> {
    const code = randomBytes(32).toString("base64url");
    if (isRedisEnabled()) {
      await this.redis.client.set(`authcode:${code}`, JSON.stringify(record), "EX", AUTH_CODE_TTL_SECONDS);
      return code;
    }
    await this.adminPrisma.authorizationCodeEntry.create({
      data: {
        code,
        userId: record.userId,
        tenantId: record.tenantId,
        codeChallenge: record.codeChallenge,
        expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
      },
    });
    return code;
  }

  /**
   * Konsumsi sekali pakai. Redis 5.0.14 (portable Windows build dipakai dev
   * lokal) belum punya GETDEL (baru ada sejak Redis 6.2) — dipakai GET+DEL
   * manual. Race window ini diterima untuk auth code berumur 60 detik
   * (bukan secret jangka panjang seperti refresh token). Jalur DB
   * (REDIS_ENABLED=false) pakai deleteMany+return sebelum delete utk alasan
   * race window yang sama — bukan SELECT...FOR UPDATE, konsisten trade-off
   * yang sudah diterima jalur Redis.
   */
  async consume(code: string): Promise<AuthCodeRecord | null> {
    if (isRedisEnabled()) {
      const key = `authcode:${code}`;
      const raw = await this.redis.client.get(key);
      if (!raw) {
        return null;
      }
      await this.redis.client.del(key);
      return JSON.parse(raw) as AuthCodeRecord;
    }

    const row = await this.adminPrisma.authorizationCodeEntry.findUnique({ where: { code } });
    if (!row || row.expiresAt <= new Date()) {
      return null;
    }
    await this.adminPrisma.authorizationCodeEntry.delete({ where: { code } });
    return { userId: row.userId, tenantId: row.tenantId, codeChallenge: row.codeChallenge, codeChallengeMethod: "S256" };
  }
}
