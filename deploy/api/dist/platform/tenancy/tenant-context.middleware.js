"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContextMiddleware = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const token_service_1 = require("../auth/token.service");
const tenant_context_1 = require("./tenant-context");
// Task 0.6 selesai: tenant_id sekarang diambil dari klaim `tenant_id` JWT
// access token TERVERIFIKASI (TDD §5.1, §8.1) — bukan lagi header
// `x-tenant-id` mentah (bisa dipalsukan client, lihat riwayat komentar
// sebelumnya). Kalau tidak ada Authorization: Bearer atau tokennya tidak
// valid, middleware ini TIDAK men-set context apa pun — request lanjut
// tanpa tenant context, PrismaService.withRls() tetap fail closed seperti
// sebelumnya, dan JwtAuthGuard (global, app.module.ts) yang menolak akses
// ke route yang bukan @Public().
//
// Endpoint pre-auth yang butuh tenant SEBELUM ada JWT (login) menangani
// tenant resolution-nya sendiri secara eksplisit (baca x-tenant-id di
// auth.controller.ts/auth.service.ts) — TIDAK lewat middleware global ini,
// supaya tidak ada jalur diam-diam yang mempercayai header untuk route
// selain login (lihat plan task 0.6 §5).
//
// TokenService di sini dibuat manual (bukan lewat Nest DI) supaya
// TenancyModule tidak perlu import AuthModule (hindari circular dependency:
// AuthModule sendiri import TenancyModule untuk PrismaService).
const tokenService = new token_service_1.TokenService(new jwt_1.JwtService({ secret: process.env.JWT_ACCESS_TOKEN_SECRET }));
let TenantContextMiddleware = class TenantContextMiddleware {
    use(req, _res, next) {
        const authHeader = req.header("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            next();
            return;
        }
        try {
            const claims = tokenService.verifyAccessToken(authHeader.slice("Bearer ".length));
            req.jwtClaims = claims;
            // userId (task 0.13) — claims.sub SAMA yang dipakai JwtAuthGuard mengisi
            // req.user.userId (current-user.decorator.ts); disalin ke sini juga
            // supaya kode DALAM (service/repository, tidak pegang req) bisa baca
            // via getCurrentUserId() untuk structured log & audit trail.
            tenant_context_1.tenantContextStorage.run({ tenantId: claims.tenant_id, userId: claims.sub }, () => next());
        }
        catch {
            // Token tidak valid/kedaluwarsa — tidak set context, lanjut tanpa
            // tenant (fail closed di withRls(); JwtAuthGuard yang tegas menolak
            // untuk route yang butuh auth).
            next();
        }
    }
};
exports.TenantContextMiddleware = TenantContextMiddleware;
exports.TenantContextMiddleware = TenantContextMiddleware = __decorate([
    (0, common_1.Injectable)()
], TenantContextMiddleware);
//# sourceMappingURL=tenant-context.middleware.js.map