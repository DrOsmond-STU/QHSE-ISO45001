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
exports.RefreshTokenService = exports.RefreshTokenReuseDetectedException = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const auth_constants_1 = require("./auth.constants");
// Dibedakan dari UnauthorizedException biasa supaya caller (AuthService) bisa
// men-trigger audit trail DB (user_sessions.revoked_reason =
// TOKEN_REUSE_DETECTED) tanpa string-matching pesan error.
class RefreshTokenReuseDetectedException extends common_1.UnauthorizedException {
    userId;
    tenantId;
    constructor(userId, tenantId) {
        super("Refresh token reuse terdeteksi — seluruh sesi telah di-revoke.");
        this.userId = userId;
        this.tenantId = tenantId;
    }
}
exports.RefreshTokenReuseDetectedException = RefreshTokenReuseDetectedException;
function hashSecret(secret) {
    return (0, node_crypto_1.createHash)("sha256").update(secret).digest("hex");
}
function generateSecret() {
    return (0, node_crypto_1.randomBytes)(auth_constants_1.REFRESH_TOKEN_BYTES).toString("base64url");
}
function formatToken(userId, sessionId, secret) {
    return `${userId}.${sessionId}.${secret}`;
}
function parseToken(token) {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
        throw new common_1.UnauthorizedException("Refresh token tidak valid.");
    }
    const [userId, sessionId, secret] = parts;
    return { userId, sessionId, secret };
}
let RefreshTokenService = class RefreshTokenService {
    sessionStore;
    constructor(sessionStore) {
        this.sessionStore = sessionStore;
    }
    /** Dipanggil saat sesi baru dibuat (login sukses / token-exchange awal). */
    async issue(userId, tenantId, sessionId, ttlSeconds) {
        const secret = generateSecret();
        await this.sessionStore.set(userId, sessionId, { tenantId, currentSecretHash: hashSecret(secret) }, ttlSeconds);
        return formatToken(userId, sessionId, secret);
    }
    /**
     * Rotasi: refresh token lama langsung invalid, refresh token baru
     * dikembalikan. `resolveTtlSeconds` menerima tenantId SETELAH sesi
     * ditemukan (baru di titik itu tenant diketahui) — dipakai caller untuk
     * membaca PasswordPolicy.sessionTimeoutMinutes tanpa perlu fetch sesi dua
     * kali.
     */
    async rotate(presentedToken, resolveTtlSeconds) {
        const { userId, sessionId, secret } = parseToken(presentedToken);
        const record = await this.sessionStore.get(userId, sessionId);
        if (!record) {
            // Sesi sudah tidak ada (revoked/expired) — fail closed, tidak ada yang
            // bisa di-cascade-revoke karena memang sudah tidak ada state aktif.
            throw new common_1.UnauthorizedException("Sesi tidak ditemukan atau sudah revoked.");
        }
        if (hashSecret(secret) !== record.currentSecretHash) {
            // REUSE TERDETEKSI — token ini sudah tidak jadi "current" untuk sesi
            // yang masih hidup, artinya sedang direplay. Revoke total.
            const tenantId = record.tenantId;
            await this.sessionStore.deleteAllForUser(userId);
            throw new RefreshTokenReuseDetectedException(userId, tenantId);
        }
        const ttlSeconds = await resolveTtlSeconds(record.tenantId);
        const newSecret = generateSecret();
        await this.sessionStore.set(userId, sessionId, { tenantId: record.tenantId, currentSecretHash: hashSecret(newSecret) }, ttlSeconds);
        return {
            refreshToken: formatToken(userId, sessionId, newSecret),
            userId,
            tenantId: record.tenantId,
            sessionId,
        };
    }
    async revokeSession(userId, sessionId) {
        await this.sessionStore.delete(userId, sessionId);
    }
    async revokeAllForUser(userId) {
        await this.sessionStore.deleteAllForUser(userId);
    }
    /** Dipakai jwt-auth.guard untuk cek keberadaan sesi (revocation langsung). */
    async isSessionAlive(userId, sessionId) {
        return (await this.sessionStore.get(userId, sessionId)) !== null;
    }
};
exports.RefreshTokenService = RefreshTokenService;
exports.RefreshTokenService = RefreshTokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], RefreshTokenService);
