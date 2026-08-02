import { PrismaService } from "../tenancy/prisma.service";
import { AuthorizationCodeService } from "./authorization-code.service";
import { LoginDto } from "./dto/login.dto";
import { LockoutService } from "./lockout.service";
import { MfaService } from "./mfa.service";
import { PasswordService } from "./password.service";
import { RefreshTokenService } from "./refresh-token.service";
import { TokenService } from "./token.service";
export interface DeviceMetadata {
    ipAddress?: string;
    userAgent?: string;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export declare class AuthService {
    private readonly prisma;
    private readonly passwordService;
    private readonly lockoutService;
    private readonly authorizationCodeService;
    private readonly refreshTokenService;
    private readonly tokenService;
    private readonly mfaService;
    constructor(prisma: PrismaService, passwordService: PasswordService, lockoutService: LockoutService, authorizationCodeService: AuthorizationCodeService, refreshTokenService: RefreshTokenService, tokenService: TokenService, mfaService: MfaService);
    /** POST /auth/login — tenant BELUM diketahui dari JWT (belum ada), jadi
     * eksplisit dari header x-tenant-id (BR-01: email unik per tenant, bukan
     * global). Mengembalikan auth code, BUKAN token — token baru dimint saat
     * token-exchange (grant authorization_code). */
    login(tenantId: string, dto: LoginDto): Promise<{
        code: string;
        state?: string;
    }>;
    /** POST /auth/token, grant=authorization_code — konsumsi code (sekali
     * pakai), verifikasi PKCE, baru di sini sesi (Redis + user_sessions)
     * benar-benar dibuat. */
    exchangeAuthorizationCode(code: string, codeVerifier: string, metadata: DeviceMetadata): Promise<TokenPair>;
    /** POST /auth/token, grant=refresh_token — rotasi wajib; reuse memicu
     * revoke total (acceptance criterion task 0.6). */
    exchangeRefreshToken(presentedRefreshToken: string): Promise<TokenPair>;
    /** POST /auth/logout — revoke sesi milik caller saja. */
    logout(userId: string, tenantId: string, sessionId: string): Promise<void>;
    /** POST /auth/logout-all — acceptance criterion task 0.6. */
    logoutAll(userId: string, tenantId: string): Promise<void>;
    /** POST /auth/mfa/setup (protected) — generate secret baru, simpan
     * TERENKRIPSI, TAPI mfaEnabled masih false sampai dikonfirmasi (confirmMfa)
     * dengan satu kode valid — mencegah user "terkunci" MFA aktif sebelum
     * terbukti authenticator app-nya benar ter-setup. */
    setupMfa(userId: string, tenantId: string): Promise<{
        secret: string;
        provisioningUri: string;
    }>;
    /** POST /auth/mfa/confirm (protected) — kode pertama valid mengaktifkan
     * MFA (mfaEnabled=true). */
    confirmMfa(userId: string, tenantId: string, totpCode: string): Promise<void>;
    private markAllSessionsRevoked;
    private signAccessToken;
}
