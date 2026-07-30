import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

// Client Redis dipakai bersama oleh RedisSessionStore, AuthorizationCodeService,
// RateLimitGuard (TDD §12). Satu koneksi, siklus hidup dikelola Nest (mirror
// pola PrismaService di tenancy/prisma.service.ts).
@Injectable()
export class RedisProvider implements OnModuleDestroy {
  readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
