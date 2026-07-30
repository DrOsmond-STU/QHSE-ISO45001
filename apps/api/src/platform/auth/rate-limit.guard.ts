import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { LOGIN_RATE_LIMIT_PER_MINUTE } from "./auth.constants";
import { RedisProvider } from "./redis.provider";

// Rate limit kasar per-tenant+endpoint (TDD §12 pattern
// `ratelimit:{tenant_id}:{endpoint}:{window}`, TDD §16 — endpoint sensitif
// login). Redis-only/ephemeral sengaja diterima di sini (anti-automation
// noise reduction, bukan kontrol keamanan utama — itu tugas LockoutService
// yang durable di Postgres).
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisProvider) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const tenantId = req.header("x-tenant-id") ?? "unknown";
    const windowMinute = Math.floor(Date.now() / 60_000);
    const key = `ratelimit:${tenantId}:auth.login:${windowMinute}`;

    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, 60);
    }

    if (count > LOGIN_RATE_LIMIT_PER_MINUTE) {
      throw new HttpException(
        "Terlalu banyak percobaan login, coba lagi nanti.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
