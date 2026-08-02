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
exports.AuthorizationCodeService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const auth_constants_1 = require("./auth.constants");
const redis_enabled_helper_1 = require("../scheduling/redis-enabled.helper");
const redis_provider_1 = require("./redis.provider");
let AuthorizationCodeService = class AuthorizationCodeService {
    redis;
    adminPrisma;
    constructor(redis) {
        this.redis = redis;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async issue(record) {
        const code = (0, node_crypto_1.randomBytes)(32).toString("base64url");
        if ((0, redis_enabled_helper_1.isRedisEnabled)()) {
            await this.redis.client.set(`authcode:${code}`, JSON.stringify(record), "EX", auth_constants_1.AUTH_CODE_TTL_SECONDS);
            return code;
        }
        await this.adminPrisma.authorizationCodeEntry.create({
            data: {
                code,
                userId: record.userId,
                tenantId: record.tenantId,
                codeChallenge: record.codeChallenge,
                expiresAt: new Date(Date.now() + auth_constants_1.AUTH_CODE_TTL_SECONDS * 1000),
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
    async consume(code) {
        if ((0, redis_enabled_helper_1.isRedisEnabled)()) {
            const key = `authcode:${code}`;
            const raw = await this.redis.client.get(key);
            if (!raw) {
                return null;
            }
            await this.redis.client.del(key);
            return JSON.parse(raw);
        }
        const row = await this.adminPrisma.authorizationCodeEntry.findUnique({ where: { code } });
        if (!row || row.expiresAt <= new Date()) {
            return null;
        }
        await this.adminPrisma.authorizationCodeEntry.delete({ where: { code } });
        return { userId: row.userId, tenantId: row.tenantId, codeChallenge: row.codeChallenge, codeChallengeMethod: "S256" };
    }
};
exports.AuthorizationCodeService = AuthorizationCodeService;
exports.AuthorizationCodeService = AuthorizationCodeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_provider_1.RedisProvider])
], AuthorizationCodeService);
