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
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("./public.decorator");
const refresh_token_service_1 = require("./refresh-token.service");
const token_service_1 = require("./token.service");
// Guard global (didaftarkan APP_GUARD di app.module.ts) — fail closed by
// default. Verifikasi signature+exp JWT (TokenService) DAN cek keberadaan
// sesi di Redis (RefreshTokenService.isSessionAlive) supaya revocation
// (logout/logout-all/reuse-detect) langsung berlaku, bukan menunggu exp 15
// menit (TDD §8.1 — Redis dipakai justru karena JWT stateless tidak bisa
// di-revoke langsung).
let JwtAuthGuard = class JwtAuthGuard {
    tokenService;
    refreshTokenService;
    reflector;
    constructor(tokenService, refreshTokenService, reflector) {
        this.tokenService = tokenService;
        this.refreshTokenService = refreshTokenService;
        this.reflector = reflector;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const req = context.switchToHttp().getRequest();
        // tenant-context.middleware.ts (global) sudah verifikasi+decode token yang
        // sama sebelum guard ini jalan — pakai hasilnya kalau ada supaya tidak
        // verify JWT dua kali per request.
        let claims = req.jwtClaims;
        if (!claims) {
            const authHeader = req.header("authorization");
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                throw new common_1.UnauthorizedException("Access token tidak ditemukan.");
            }
            try {
                claims = this.tokenService.verifyAccessToken(authHeader.slice("Bearer ".length));
            }
            catch {
                throw new common_1.UnauthorizedException("Access token tidak valid atau kedaluwarsa.");
            }
        }
        const alive = await this.refreshTokenService.isSessionAlive(claims.sub, claims.sid);
        if (!alive) {
            throw new common_1.UnauthorizedException("Sesi telah di-revoke.");
        }
        req.user = {
            userId: claims.sub,
            tenantId: claims.tenant_id,
            sessionId: claims.sid,
            scopeRoles: claims.scope_roles,
        };
        return true;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [token_service_1.TokenService,
        refresh_token_service_1.RefreshTokenService,
        core_1.Reflector])
], JwtAuthGuard);
