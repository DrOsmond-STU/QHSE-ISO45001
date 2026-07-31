import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { SessionRecord, SessionStore } from "./session-store.interface";

// Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
// RedisSessionStore. Client admin SENDIRI (bypass RLS, pola sama adminPrisma
// di *-due-scan.service.ts) — get(userId, sessionId) dipanggil SEBELUM
// tenant diketahui (tenantId baru terbaca DARI baris ini, lihat
// refresh-token.service.ts rotate()), jadi tidak bisa lewat withRls() yang
// mensyaratkan tenant context SUDAH di-set duluan. Baris expired TIDAK
// dihapus otomatis di sini (dibiarkan menumpuk, difilter WHERE expires_at >
// now() saat baca) — pembersihan berkala di luar scope task ini, gap
// terdokumentasi TDD §26 (lihat juga panduan deployment shared-hosting).
@Injectable()
export class DbSessionStore implements SessionStore, OnModuleDestroy {
  private readonly adminPrisma: PrismaClient;

  constructor() {
    this.adminPrisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.adminPrisma.$disconnect();
  }

  async get(userId: string, sessionId: string): Promise<SessionRecord | null> {
    const row = await this.adminPrisma.sessionCacheEntry.findUnique({ where: { userId_sessionId: { userId, sessionId } } });
    if (!row || row.expiresAt <= new Date()) return null;
    return { tenantId: row.tenantId, currentSecretHash: row.currentSecretHash };
  }

  async set(userId: string, sessionId: string, record: SessionRecord, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await this.adminPrisma.sessionCacheEntry.upsert({
      where: { userId_sessionId: { userId, sessionId } },
      create: { userId, sessionId, tenantId: record.tenantId, currentSecretHash: record.currentSecretHash, expiresAt },
      update: { currentSecretHash: record.currentSecretHash, expiresAt },
    });
  }

  async delete(userId: string, sessionId: string): Promise<void> {
    await this.adminPrisma.sessionCacheEntry.deleteMany({ where: { userId, sessionId } });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.adminPrisma.sessionCacheEntry.deleteMany({ where: { userId } });
  }
}
