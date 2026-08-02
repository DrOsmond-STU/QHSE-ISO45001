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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../tenancy/prisma.service");
const tenant_context_1 = require("../tenancy/tenant-context");
const authorization_code_service_1 = require("./authorization-code.service");
const auth_constants_1 = require("./auth.constants");
const lockout_service_1 = require("./lockout.service");
const mfa_service_1 = require("./mfa.service");
const password_service_1 = require("./password.service");
const pkce_util_1 = require("./pkce.util");
const refresh_token_service_1 = require("./refresh-token.service");
const token_service_1 = require("./token.service");
// Generic error — sengaja SAMA untuk wrong-password/no-such-user/locked/
// suspended, supaya endpoint /auth/login tidak jadi oracle enumerasi user
// (TDD §16).
function loginFailed() {
    return new common_1.UnauthorizedException("Email atau password salah.");
}
let AuthService = class AuthService {
    prisma;
    passwordService;
    lockoutService;
    authorizationCodeService;
    refreshTokenService;
    tokenService;
    mfaService;
    constructor(prisma, passwordService, lockoutService, authorizationCodeService, refreshTokenService, tokenService, mfaService) {
        this.prisma = prisma;
        this.passwordService = passwordService;
        this.lockoutService = lockoutService;
        this.authorizationCodeService = authorizationCodeService;
        this.refreshTokenService = refreshTokenService;
        this.tokenService = tokenService;
        this.mfaService = mfaService;
    }
    /** POST /auth/login — tenant BELUM diketahui dari JWT (belum ada), jadi
     * eksplisit dari header x-tenant-id (BR-01: email unik per tenant, bukan
     * global). Mengembalikan auth code, BUKAN token — token baru dimint saat
     * token-exchange (grant authorization_code). */
    async login(tenantId, dto) {
        // PENTING: throw di DALAM $transaction (withRls) akan rollback SEMUA
        // write di transaksi itu, termasuk increment failedLoginAttempts yang
        // justru harus tetap tersimpan meski login-nya sendiri gagal. Jadi hasil
        // sukses/gagal dikembalikan sebagai value, BUKAN exception, dan baru
        // di-throw di luar transaksi setelah counter ter-commit.
        const result = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const user = await tx.user.findUnique({
                where: { tenantId_email: { tenantId, email: dto.email } },
            });
            if (!user || user.status !== "ACTIVE") {
                return { ok: false, reason: "INVALID_CREDENTIALS" };
            }
            const policy = await tx.passwordPolicy.findUnique({ where: { tenantId } });
            const maxFailedAttempts = policy?.maxFailedAttempts ?? auth_constants_1.DEFAULT_PASSWORD_POLICY.maxFailedAttempts;
            const lockoutDurationMinutes = policy?.lockoutDurationMinutes ?? auth_constants_1.DEFAULT_PASSWORD_POLICY.lockoutDurationMinutes;
            const lockoutState = { failedLoginAttempts: user.failedLoginAttempts, lockedUntil: user.lockedUntil };
            if (this.lockoutService.isLocked(lockoutState)) {
                return { ok: false, reason: "INVALID_CREDENTIALS" };
            }
            const passwordOk = user.passwordHash
                ? await this.passwordService.verify(user.passwordHash, dto.password)
                : false;
            if (!passwordOk) {
                const next = this.lockoutService.recordFailure(lockoutState, {
                    maxFailedAttempts,
                    lockoutDurationMinutes,
                });
                await tx.user.update({
                    where: { id: user.id },
                    data: { failedLoginAttempts: next.failedLoginAttempts, lockedUntil: next.lockedUntil },
                });
                return { ok: false, reason: "INVALID_CREDENTIALS" };
            }
            // Password benar dari sini — reset lockout counter TERLEPAS dari hasil
            // MFA di bawah (failedLoginAttempts hanya melacak brute-force
            // password, faktor kedua punya perlindungan sendiri via rate-limit
            // guard endpoint yang sama).
            const reset = this.lockoutService.resetOnSuccess();
            await tx.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: reset.failedLoginAttempts, lockedUntil: reset.lockedUntil },
            });
            // Task 0.7 — sysadmin.* WAJIB MFA tanpa pengecualian (TDD §8.1).
            // Task 0.8: placeholder isSysadmin sudah dipensiunkan — cek role
            // SUPER_ADMIN_PLATFORM sungguhan lewat UserRole (query langsung pakai
            // tx yang sama, BUKAN PermissionService — hindari nested
            // $transaction; lihat plan task 0.8 §"Where does that check live?").
            if ((await isSuperAdminPlatform(tx, user.id, tenantId)) && !user.mfaEnabled) {
                return { ok: false, reason: "MFA_SETUP_REQUIRED" };
            }
            if (user.mfaEnabled) {
                const secret = this.mfaService.decryptSecret(user.mfaSecretEncrypted);
                if (!dto.totpCode || !this.mfaService.verifyToken(secret, dto.totpCode)) {
                    return { ok: false, reason: "MFA_REQUIRED" };
                }
            }
            await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
            return { ok: true, userId: user.id };
        }));
        if (!result.ok) {
            if (result.reason === "MFA_SETUP_REQUIRED") {
                throw new common_1.ForbiddenException("MFA_SETUP_REQUIRED");
            }
            if (result.reason === "MFA_REQUIRED") {
                throw new common_1.UnauthorizedException("MFA_REQUIRED");
            }
            throw loginFailed();
        }
        const code = await this.authorizationCodeService.issue({
            userId: result.userId,
            tenantId,
            codeChallenge: dto.codeChallenge,
            codeChallengeMethod: dto.codeChallengeMethod,
        });
        return { code, state: dto.state };
    }
    /** POST /auth/token, grant=authorization_code — konsumsi code (sekali
     * pakai), verifikasi PKCE, baru di sini sesi (Redis + user_sessions)
     * benar-benar dibuat. */
    async exchangeAuthorizationCode(code, codeVerifier, metadata) {
        const record = await this.authorizationCodeService.consume(code);
        if (!record) {
            throw new common_1.UnauthorizedException("Auth code tidak valid, kedaluwarsa, atau sudah dipakai.");
        }
        if (!(0, pkce_util_1.verifyPkce)(codeVerifier, record.codeChallenge, record.codeChallengeMethod)) {
            throw new common_1.UnauthorizedException("PKCE code_verifier tidak cocok.");
        }
        return tenant_context_1.tenantContextStorage.run({ tenantId: record.tenantId }, async () => {
            const sessionId = (0, node_crypto_1.randomUUID)();
            const policy = await this.prisma.withRls((tx) => tx.passwordPolicy.findUnique({ where: { tenantId: record.tenantId } }));
            const sessionTimeoutMinutes = policy?.sessionTimeoutMinutes ?? auth_constants_1.DEFAULT_PASSWORD_POLICY.sessionTimeoutMinutes;
            const ttlSeconds = sessionTimeoutMinutes * 60;
            const refreshToken = await this.refreshTokenService.issue(record.userId, record.tenantId, sessionId, ttlSeconds);
            const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
            await this.prisma.withRls((tx) => tx.userSession.create({
                data: {
                    id: sessionId,
                    tenantId: record.tenantId,
                    userId: record.userId,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                    sessionTokenHash: hashForAudit(refreshToken),
                    expiresAt,
                },
            }));
            const accessToken = this.signAccessToken({
                sub: record.userId,
                tenant_id: record.tenantId,
                scope_roles: [],
                sid: sessionId,
            });
            return { accessToken, refreshToken, expiresIn: auth_constants_1.ACCESS_TOKEN_TTL_SECONDS };
        });
    }
    /** POST /auth/token, grant=refresh_token — rotasi wajib; reuse memicu
     * revoke total (acceptance criterion task 0.6). */
    async exchangeRefreshToken(presentedRefreshToken) {
        let rotated;
        try {
            rotated = await this.refreshTokenService.rotate(presentedRefreshToken, (tenantId) => tenant_context_1.tenantContextStorage.run({ tenantId }, async () => {
                const policy = await this.prisma.withRls((tx) => tx.passwordPolicy.findUnique({ where: { tenantId } }));
                const sessionTimeoutMinutes = policy?.sessionTimeoutMinutes ?? auth_constants_1.DEFAULT_PASSWORD_POLICY.sessionTimeoutMinutes;
                return sessionTimeoutMinutes * 60;
            }));
        }
        catch (err) {
            if (err instanceof refresh_token_service_1.RefreshTokenReuseDetectedException) {
                await this.markAllSessionsRevoked(err.userId, err.tenantId, "TOKEN_REUSE_DETECTED");
            }
            throw err;
        }
        return tenant_context_1.tenantContextStorage.run({ tenantId: rotated.tenantId }, async () => {
            await this.prisma.withRls((tx) => tx.userSession.update({
                where: { id: rotated.sessionId },
                data: { sessionTokenHash: hashForAudit(rotated.refreshToken) },
            }));
            const accessToken = this.signAccessToken({
                sub: rotated.userId,
                tenant_id: rotated.tenantId,
                scope_roles: [],
                sid: rotated.sessionId,
            });
            return { accessToken, refreshToken: rotated.refreshToken, expiresIn: auth_constants_1.ACCESS_TOKEN_TTL_SECONDS };
        });
    }
    /** POST /auth/logout — revoke sesi milik caller saja. */
    async logout(userId, tenantId, sessionId) {
        await this.refreshTokenService.revokeSession(userId, sessionId);
        await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.userSession.update({
            where: { id: sessionId },
            data: { revoked: true, revokedReason: "USER_LOGOUT", logoutAt: new Date() },
        })));
    }
    /** POST /auth/logout-all — acceptance criterion task 0.6. */
    async logoutAll(userId, tenantId) {
        await this.refreshTokenService.revokeAllForUser(userId);
        await this.markAllSessionsRevoked(userId, tenantId, "USER_LOGOUT");
    }
    /** POST /auth/mfa/setup (protected) — generate secret baru, simpan
     * TERENKRIPSI, TAPI mfaEnabled masih false sampai dikonfirmasi (confirmMfa)
     * dengan satu kode valid — mencegah user "terkunci" MFA aktif sebelum
     * terbukti authenticator app-nya benar ter-setup. */
    async setupMfa(userId, tenantId) {
        const secret = this.mfaService.generateSecret();
        const encrypted = this.mfaService.encryptSecret(secret);
        const email = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const user = await tx.user.update({
                where: { id: userId },
                data: { mfaSecretEncrypted: encrypted },
            });
            return user.email;
        }));
        return { secret, provisioningUri: this.mfaService.getProvisioningUri(email, secret) };
    }
    /** POST /auth/mfa/confirm (protected) — kode pertama valid mengaktifkan
     * MFA (mfaEnabled=true). */
    async confirmMfa(userId, tenantId, totpCode) {
        await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user?.mfaSecretEncrypted) {
                throw new common_1.UnauthorizedException("MFA belum di-setup — panggil /auth/mfa/setup terlebih dahulu.");
            }
            const secret = this.mfaService.decryptSecret(user.mfaSecretEncrypted);
            if (!this.mfaService.verifyToken(secret, totpCode)) {
                throw new common_1.UnauthorizedException("Kode MFA tidak valid.");
            }
            await tx.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
        }));
    }
    async markAllSessionsRevoked(userId, tenantId, reason) {
        await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.userSession.updateMany({
            where: { userId, revoked: false },
            data: { revoked: true, revokedReason: reason, logoutAt: new Date() },
        })));
    }
    signAccessToken(payload) {
        return this.tokenService.signAccessToken(payload);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        password_service_1.PasswordService,
        lockout_service_1.LockoutService,
        authorization_code_service_1.AuthorizationCodeService,
        refresh_token_service_1.RefreshTokenService,
        token_service_1.TokenService,
        mfa_service_1.MfaService])
], AuthService);
// user_sessions.session_token_hash = jejak audit "refresh token AKTIF
// terakhir" (PRD Modul 02 §11 — tidak pernah plaintext). Redis
// (RefreshTokenService) tetap satu-satunya mekanisme ENFORCEMENT revocation;
// kolom ini murni audit trail DB, bukan dipakai untuk validasi.
function hashForAudit(token) {
    return (0, node_crypto_1.createHash)("sha256").update(token).digest("hex");
}
// Task 0.8 — pengganti placeholder users.isSysadmin (task 0.7, sudah
// dipensiunkan). Query LANGSUNG pakai tx yang sama dari login() — SENGAJA
// tidak lewat RbacModule/PermissionService supaya tidak nesting
// $transaction kedua di dalam transaksi login() yang sudah berjalan.
// Akibatnya: AuthModule dan RbacModule tidak saling import sama sekali.
async function isSuperAdminPlatform(tx, userId, tenantId) {
    const today = new Date();
    const assignment = await tx.userRole.findFirst({
        where: {
            userId,
            tenantId,
            status: "ACTIVE",
            validFrom: { lte: today },
            OR: [{ validTo: null }, { validTo: { gte: today } }],
            role: { roleCode: "SUPER_ADMIN_PLATFORM", status: "ACTIVE" },
        },
    });
    return assignment !== null;
}
