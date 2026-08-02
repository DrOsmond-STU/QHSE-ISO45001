"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const auth_constants_1 = require("./auth.constants");
const redis_enabled_helper_1 = require("../scheduling/redis-enabled.helper");
const redis_provider_1 = require("./redis.provider");
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
let RateLimitGuard = class RateLimitGuard {
    redis;
    memoryCounters = new Map();
    constructor(redis) {
        this.redis = redis;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const tenantId = req.header("x-tenant-id") ?? "unknown";
        const windowMinute = Math.floor(Date.now() / 60_000);
        const count = (0, redis_enabled_helper_1.isRedisEnabled)() ? await this.incrRedis(tenantId, windowMinute) : this.incrMemory(tenantId, windowMinute);
        if (count > auth_constants_1.LOGIN_RATE_LIMIT_PER_MINUTE) {
            throw new common_1.HttpException("Terlalu banyak percobaan login, coba lagi nanti.", common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
    }
    async incrRedis(tenantId, windowMinute) {
        const key = `ratelimit:${tenantId}:auth.login:${windowMinute}`;
        const count = await this.redis.client.incr(key);
        if (count === 1) {
            await this.redis.client.expire(key, 60);
        }
        return count;
    }
    incrMemory(tenantId, windowMinute) {
        const key = `${tenantId}:auth.login`;
        const existing = this.memoryCounters.get(key);
        if (!existing || existing.windowMinute !== windowMinute) {
            this.memoryCounters.set(key, { count: 1, windowMinute });
            return 1;
        }
        existing.count += 1;
        return existing.count;
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_provider_1.RedisProvider])
], RateLimitGuard);
