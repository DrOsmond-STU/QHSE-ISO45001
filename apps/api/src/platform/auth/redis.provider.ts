import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

// Client Redis dipakai bersama oleh RedisSessionStore, AuthorizationCodeService,
// RateLimitGuard (TDD §12). Satu koneksi, siklus hidup dikelola Nest (mirror
// pola PrismaService di tenancy/prisma.service.ts).
//
// `lazyConnect: true` (shared-hosting adaptation, REDIS_ENABLED=false) —
// Nest MENGINSTANSIASI setiap provider yang terdaftar di module (termasuk
// RedisSessionStore/RedisPermissionCache walau tidak dipilih jadi
// implementasi aktif lewat SESSION_STORE/PERMISSION_CACHE, lihat
// auth.module.ts/rbac.module.ts) — tanpa lazyConnect, constructor ini akan
// mencoba connect ke Redis yang tidak ada SETIAP kali app boot, terlepas
// dipakai atau tidak. Dengan lazyConnect, koneksi TCP baru dibuka saat
// command pertama benar-benar dipanggil — instance yang tidak pernah
// dipakai (krn REDIS_ENABLED=false) tidak pernah connect sama sekali.
// Tidak mengubah perilaku teramati saat Redis benar-benar dipakai (VPS/
// Docker existing) — connect otomatis di command pertama, transparan.
@Injectable()
export class RedisProvider implements OnModuleDestroy {
  readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { lazyConnect: true });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
