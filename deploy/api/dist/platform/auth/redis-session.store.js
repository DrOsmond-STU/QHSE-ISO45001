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
exports.RedisSessionStore = void 0;
const common_1 = require("@nestjs/common");
const redis_provider_1 = require("./redis.provider");
// Implementasi SessionStore sungguhan (TDD §12) — key persis
// `session:{user_id}:{session_id}`. TTL per-panggilan `set()` (dihitung
// caller dari PasswordPolicy.sessionTimeoutMinutes, "sesuai session timeout
// per tenant").
let RedisSessionStore = class RedisSessionStore {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    key(userId, sessionId) {
        return `session:${userId}:${sessionId}`;
    }
    async get(userId, sessionId) {
        const raw = await this.redis.client.get(this.key(userId, sessionId));
        return raw ? JSON.parse(raw) : null;
    }
    async set(userId, sessionId, record, ttlSeconds) {
        await this.redis.client.set(this.key(userId, sessionId), JSON.stringify(record), "EX", ttlSeconds);
    }
    async delete(userId, sessionId) {
        await this.redis.client.del(this.key(userId, sessionId));
    }
    async deleteAllForUser(userId) {
        const pattern = `session:${userId}:*`;
        let cursor = "0";
        do {
            const [next, keys] = await this.redis.client.scan(cursor, "MATCH", pattern, "COUNT", 100);
            cursor = next;
            if (keys.length > 0) {
                await this.redis.client.del(...keys);
            }
        } while (cursor !== "0");
    }
};
exports.RedisSessionStore = RedisSessionStore;
exports.RedisSessionStore = RedisSessionStore = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_provider_1.RedisProvider])
], RedisSessionStore);
//# sourceMappingURL=redis-session.store.js.map