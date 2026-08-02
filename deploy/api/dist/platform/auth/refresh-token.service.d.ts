import { UnauthorizedException } from "@nestjs/common";
import { SessionStore } from "./session-store.interface";
export interface RotateResult {
    refreshToken: string;
    userId: string;
    tenantId: string;
    sessionId: string;
}
export declare class RefreshTokenReuseDetectedException extends UnauthorizedException {
    readonly userId: string;
    readonly tenantId: string;
    constructor(userId: string, tenantId: string);
}
export declare class RefreshTokenService {
    private readonly sessionStore;
    constructor(sessionStore: SessionStore);
    /** Dipanggil saat sesi baru dibuat (login sukses / token-exchange awal). */
    issue(userId: string, tenantId: string, sessionId: string, ttlSeconds: number): Promise<string>;
    /**
     * Rotasi: refresh token lama langsung invalid, refresh token baru
     * dikembalikan. `resolveTtlSeconds` menerima tenantId SETELAH sesi
     * ditemukan (baru di titik itu tenant diketahui) — dipakai caller untuk
     * membaca PasswordPolicy.sessionTimeoutMinutes tanpa perlu fetch sesi dua
     * kali.
     */
    rotate(presentedToken: string, resolveTtlSeconds: (tenantId: string) => Promise<number>): Promise<RotateResult>;
    revokeSession(userId: string, sessionId: string): Promise<void>;
    revokeAllForUser(userId: string): Promise<void>;
    /** Dipakai jwt-auth.guard untuk cek keberadaan sesi (revocation langsung). */
    isSessionAlive(userId: string, sessionId: string): Promise<boolean>;
}
