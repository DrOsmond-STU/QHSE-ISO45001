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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const current_user_decorator_1 = require("./current-user.decorator");
const login_dto_1 = require("./dto/login.dto");
const mfa_confirm_dto_1 = require("./dto/mfa-confirm.dto");
const token_exchange_dto_1 = require("./dto/token-exchange.dto");
const public_decorator_1 = require("./public.decorator");
const rate_limit_guard_1 = require("./rate-limit.guard");
// Cookie httpOnly+Secure+SameSite=Strict untuk refresh token (CSRF stance §8
// plan) — path dipersempit ke endpoint yang memang butuh, bukan seluruh domain.
//
// Path-nya HARUS bisa dikonfigurasi, bukan konstanta: kalau API dipasang di
// belakang reverse proxy yang menambahkan awalan (mis. satu subdomain melayani
// frontend di `/` dan API di `/api`, seperti deployment cPanel di
// DEPLOYMENT_SHARED_HOSTING.md), peramban melihat endpoint-nya di
// `/api/auth/token` sementara Nest melihat `/auth/token`. Cookie ber-path
// `/auth/token` akan tersimpan di peramban tapi TIDAK PERNAH dikirim balik,
// karena peramban tidak pernah meminta path itu — refresh token mati diam-diam
// tanpa pesan error apa pun. Isi REFRESH_COOKIE_PATH dengan path yang DILIHAT
// PERAMBAN (termasuk awalan proxy-nya).
const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_PATH = process.env.REFRESH_COOKIE_PATH ?? "/auth/token";
function setRefreshCookie(res, token) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: REFRESH_COOKIE_PATH,
    });
}
function clearRefreshCookie(res) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    // Pre-auth — tenant BELUM diketahui dari JWT (belum ada), lihat
    // auth.service.ts#login & plan §5. RateLimitGuard: TDD §16 endpoint sensitif.
    async login(tenantId, dto) {
        if (!tenantId) {
            throw new common_1.BadRequestException("Header x-tenant-id wajib diisi.");
        }
        const result = await this.authService.login(tenantId, dto);
        return { data: result };
    }
    async token(dto, req, res) {
        if (dto.grantType === "authorization_code") {
            if (!dto.code || !dto.codeVerifier) {
                throw new common_1.BadRequestException("code dan codeVerifier wajib untuk grant authorization_code.");
            }
            const pair = await this.authService.exchangeAuthorizationCode(dto.code, dto.codeVerifier, {
                ipAddress: req.ip,
                userAgent: req.header("user-agent"),
            });
            setRefreshCookie(res, pair.refreshToken);
            return { data: { accessToken: pair.accessToken, tokenType: "Bearer", expiresIn: pair.expiresIn } };
        }
        const presented = req.cookies?.[REFRESH_COOKIE_NAME];
        if (!presented) {
            throw new common_1.UnauthorizedException("Refresh token tidak ditemukan.");
        }
        const pair = await this.authService.exchangeRefreshToken(presented);
        setRefreshCookie(res, pair.refreshToken);
        return { data: { accessToken: pair.accessToken, tokenType: "Bearer", expiresIn: pair.expiresIn } };
    }
    async logout(user, res) {
        await this.authService.logout(user.userId, user.tenantId, user.sessionId);
        clearRefreshCookie(res);
    }
    // Acceptance criterion task 0.6 — "logout-all-device berfungsi".
    async logoutAll(user, res) {
        await this.authService.logoutAll(user.userId, user.tenantId);
        clearRefreshCookie(res);
    }
    // Task 0.7 — enrollment MFA. Butuh sesi valid dulu (login TANPA MFA harus
    // sudah pernah berhasil, mis. sebelum sysadmin.mfaEnabled di-set true, atau
    // user non-sysadmin yang belum diwajibkan tenant-nya) — bootstrap sysadmin
    // PERTAMA di provisioning lewat seed script (di luar API), bukan endpoint
    // ini (lihat prisma/seed-auth-dev.ts).
    async setupMfa(user) {
        const result = await this.authService.setupMfa(user.userId, user.tenantId);
        return { data: result };
    }
    async confirmMfa(user, dto) {
        await this.authService.confirmMfa(user.userId, user.tenantId, dto.totpCode);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(rate_limit_guard_1.RateLimitGuard),
    (0, common_1.Post)("login"),
    __param(0, (0, common_1.Headers)("x-tenant-id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)("token"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [token_exchange_dto_1.TokenExchangeDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "token", null);
__decorate([
    (0, common_1.Post)("logout"),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)("logout-all"),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.Post)("mfa/setup"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "setupMfa", null);
__decorate([
    (0, common_1.Post)("mfa/confirm"),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mfa_confirm_dto_1.MfaConfirmDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "confirmMfa", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map