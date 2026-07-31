import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { LOGIN_RATE_LIMIT_PER_MINUTE } from "./auth.constants";
import { isRedisEnabled } from "../scheduling/redis-enabled.helper";
import { RedisProvider } from "./redis.provider";

// Rate limit kasar per-tenant+endpoint (TDD §12 pattern
// `ratelimit:{tenant_id}:{endpoint}:{window}`, TDD §16 — endpoint sensitif
// login). Redis-only/ephemeral sengaja diterima di sini (anti-automation
// noise reduction, bukan kontrol keamanan utama — itu tugas LockoutService
// yang durable di Postgres).
//
// REDIS_ENABLED=false (shared hosting) — jatuh balik ke Map in-memory
// per-proses. Konsisten dengan sifat "ephemeral/bukan kontrol keamanan
// utama" yang SUDAH diterima di atas: hilang saat proses restart (jarang di
// Passenger/cPanel Node Selector) sama sekali tidak mengubah jaminan
// keamanan, cuma window rate-limit ter-reset lebih awal — dampak paling
// buruk MASIH ditangkap LockoutService (durable, Postgres).
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly memoryCounters = new Map<string, { count: number; windowMinute: number }>();

  constructor(private readonly redis: RedisProvider) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const tenantId = req.header("x-tenant-id") ?? "unknown";
    const windowMinute = Math.floor(Date.now() / 60_000);

    const count = isRedisEnabled() ? await this.incrRedis(tenantId, windowMinute) : this.incrMemory(tenantId, windowMinute);

    if (count > LOGIN_RATE_LIMIT_PER_MINUTE) {
      throw new HttpException(
        "Terlalu banyak percobaan login, coba lagi nanti.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private async incrRedis(tenantId: string, windowMinute: number): Promise<number> {
    const key = `ratelimit:${tenantId}:auth.login:${windowMinute}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, 60);
    }
    return count;
  }

  private incrMemory(tenantId: string, windowMinute: number): number {
    const key = `${tenantId}:auth.login`;
    const existing = this.memoryCounters.get(key);
    if (!existing || existing.windowMinute !== windowMinute) {
      this.memoryCounters.set(key, { count: 1, windowMinute });
      return 1;
    }
    existing.count += 1;
    return existing.count;
  }
}
