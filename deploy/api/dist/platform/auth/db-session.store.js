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
exports.DbSessionStore = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
// Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
// RedisSessionStore. Client admin SENDIRI (bypass RLS, pola sama adminPrisma
// di *-due-scan.service.ts) — get(userId, sessionId) dipanggil SEBELUM
// tenant diketahui (tenantId baru terbaca DARI baris ini, lihat
// refresh-token.service.ts rotate()), jadi tidak bisa lewat withRls() yang
// mensyaratkan tenant context SUDAH di-set duluan. Baris expired TIDAK
// dihapus otomatis di sini (dibiarkan menumpuk, difilter WHERE expires_at >
// now() saat baca) — pembersihan berkala di luar scope task ini, gap
// terdokumentasi TDD §26 (lihat juga panduan deployment shared-hosting).
let DbSessionStore = class DbSessionStore {
    adminPrisma;
    constructor() {
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async get(userId, sessionId) {
        const row = await this.adminPrisma.sessionCacheEntry.findUnique({ where: { userId_sessionId: { userId, sessionId } } });
        if (!row || row.expiresAt <= new Date())
            return null;
        return { tenantId: row.tenantId, currentSecretHash: row.currentSecretHash };
    }
    async set(userId, sessionId, record, ttlSeconds) {
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
        await this.adminPrisma.sessionCacheEntry.upsert({
            where: { userId_sessionId: { userId, sessionId } },
            create: { userId, sessionId, tenantId: record.tenantId, currentSecretHash: record.currentSecretHash, expiresAt },
            update: { currentSecretHash: record.currentSecretHash, expiresAt },
        });
    }
    async delete(userId, sessionId) {
        await this.adminPrisma.sessionCacheEntry.deleteMany({ where: { userId, sessionId } });
    }
    async deleteAllForUser(userId) {
        await this.adminPrisma.sessionCacheEntry.deleteMany({ where: { userId } });
    }
};
exports.DbSessionStore = DbSessionStore;
exports.DbSessionStore = DbSessionStore = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DbSessionStore);
//# sourceMappingURL=db-session.store.js.map