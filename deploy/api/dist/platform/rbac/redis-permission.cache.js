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
exports.RedisPermissionCache = void 0;
const common_1 = require("@nestjs/common");
const redis_provider_1 = require("../auth/redis.provider");
// TDD §12 — key persis `perm:{user_id}`.
let RedisPermissionCache = class RedisPermissionCache {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    key(userId) {
        return `perm:${userId}`;
    }
    async get(userId) {
        const raw = await this.redis.client.get(this.key(userId));
        return raw ? JSON.parse(raw) : null;
    }
    async set(userId, value, ttlSeconds) {
        await this.redis.client.set(this.key(userId), JSON.stringify(value), "EX", ttlSeconds);
    }
    async invalidate(userId) {
        await this.redis.client.del(this.key(userId));
    }
};
exports.RedisPermissionCache = RedisPermissionCache;
exports.RedisPermissionCache = RedisPermissionCache = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_provider_1.RedisProvider])
], RedisPermissionCache);
//# sourceMappingURL=redis-permission.cache.js.map