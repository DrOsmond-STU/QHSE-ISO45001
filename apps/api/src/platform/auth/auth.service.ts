import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../tenancy/prisma.service";
import { tenantContextStorage } from "../tenancy/tenant-context";
import { AuthorizationCodeService } from "./authorization-code.service";
import { ACCESS_TOKEN_TTL_SECONDS, DEFAULT_PASSWORD_POLICY } from "./auth.constants";
import { LoginDto } from "./dto/login.dto";
import { LockoutService } from "./lockout.service";
import { MfaService } from "./mfa.service";
import { PasswordService } from "./password.service";
import { verifyPkce } from "./pkce.util";
import { RefreshTokenReuseDetectedException, RefreshTokenService } from "./refresh-token.service";
import { AccessTokenPayload, TokenService } from "./token.service";

export interface DeviceMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Generic error — sengaja SAMA untuk wrong-password/no-such-user/locked/
// suspended, supaya endpoint /auth/login tidak jadi oracle enumerasi user
// (TDD §16).
function loginFailed(): UnauthorizedException {
  return new UnauthorizedException("Email atau password salah.");
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly lockoutService: LockoutService,
    private readonly authorizationCodeService: AuthorizationCodeService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly tokenService: TokenService,
    private readonly mfaService: MfaService,
  ) {}

  /** POST /auth/login — tenant BELUM diketahui dari JWT (belum ada), jadi
   * eksplisit dari header x-tenant-id (BR-01: email unik per tenant, bukan
   * global). Mengembalikan auth code, BUKAN token — token baru dimint saat
   * token-exchange (grant authorization_code). */
  async login(tenantId: string, dto: LoginDto): Promise<{ code: string; state?: string }> {
    // PENTING: throw di DALAM $transaction (withRls) akan rollback SEMUA
    // write di transaksi itu, termasuk increment failedLoginAttempts yang
    // justru harus tetap tersimpan meski login-nya sendiri gagal. Jadi hasil
    // sukses/gagal dikembalikan sebagai value, BUKAN exception, dan baru
    // di-throw di luar transaksi setelah counter ter-commit.
    const result = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const user = await tx.user.findUnique({
          where: { tenantId_email: { tenantId, email: dto.email } },
        });
        if (!user || user.status !== "ACTIVE") {
          return { ok: false as const, reason: "INVALID_CREDENTIALS" as const };
        }

        const policy = await tx.passwordPolicy.findUnique({ where: { tenantId } });
        const maxFailedAttempts = policy?.maxFailedAttempts ?? DEFAULT_PASSWORD_POLICY.maxFailedAttempts;
        const lockoutDurationMinutes =
          policy?.lockoutDurationMinutes ?? DEFAULT_PASSWORD_POLICY.lockoutDurationMinutes;

        const lockoutState = { failedLoginAttempts: user.failedLoginAttempts, lockedUntil: user.lockedUntil };
        if (this.lockoutService.isLocked(lockoutState)) {
          return { ok: false as const, reason: "INVALID_CREDENTIALS" as const };
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
          return { ok: false as const, reason: "INVALID_CREDENTIALS" as const };
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
          return { ok: false as const, reason: "MFA_SETUP_REQUIRED" as const };
        }

        if (user.mfaEnabled) {
          const secret = this.mfaService.decryptSecret(user.mfaSecretEncrypted!);
          if (!dto.totpCode || !this.mfaService.verifyToken(secret, dto.totpCode)) {
            return { ok: false as const, reason: "MFA_REQUIRED" as const };
          }
        }

        await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { ok: true as const, userId: user.id };
      }),
    );

    if (!result.ok) {
      if (result.reason === "MFA_SETUP_REQUIRED") {
        throw new ForbiddenException("MFA_SETUP_REQUIRED");
      }
      if (result.reason === "MFA_REQUIRED") {
        throw new UnauthorizedException("MFA_REQUIRED");
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
  async exchangeAuthorizationCode(
    code: string,
    codeVerifier: string,
    metadata: DeviceMetadata,
  ): Promise<TokenPair> {
    const record = await this.authorizationCodeService.consume(code);
    if (!record) {
      throw new UnauthorizedException("Auth code tidak valid, kedaluwarsa, atau sudah dipakai.");
    }
    if (!verifyPkce(codeVerifier, record.codeChallenge, record.codeChallengeMethod)) {
      throw new UnauthorizedException("PKCE code_verifier tidak cocok.");
    }

    return tenantContextStorage.run({ tenantId: record.tenantId }, async () => {
      const sessionId = randomUUID();
      const policy = await this.prisma.withRls((tx) =>
        tx.passwordPolicy.findUnique({ where: { tenantId: record.tenantId } }),
      );
      const sessionTimeoutMinutes = policy?.sessionTimeoutMinutes ?? DEFAULT_PASSWORD_POLICY.sessionTimeoutMinutes;
      const ttlSeconds = sessionTimeoutMinutes * 60;

      const refreshToken = await this.refreshTokenService.issue(record.userId, record.tenantId, sessionId, ttlSeconds);

      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      await this.prisma.withRls((tx) =>
        tx.userSession.create({
          data: {
            id: sessionId,
            tenantId: record.tenantId,
            userId: record.userId,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            sessionTokenHash: hashForAudit(refreshToken),
            expiresAt,
          },
        }),
      );

      const accessToken = this.signAccessToken({
        sub: record.userId,
        tenant_id: record.tenantId,
        scope_roles: [],
        sid: sessionId,
      });

      return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
    });
  }

  /** POST /auth/token, grant=refresh_token — rotasi wajib; reuse memicu
   * revoke total (acceptance criterion task 0.6). */
  async exchangeRefreshToken(presentedRefreshToken: string): Promise<TokenPair> {
    let rotated;
    try {
      rotated = await this.refreshTokenService.rotate(presentedRefreshToken, (tenantId) =>
        tenantContextStorage.run({ tenantId }, async () => {
          const policy = await this.prisma.withRls((tx) => tx.passwordPolicy.findUnique({ where: { tenantId } }));
          const sessionTimeoutMinutes = policy?.sessionTimeoutMinutes ?? DEFAULT_PASSWORD_POLICY.sessionTimeoutMinutes;
          return sessionTimeoutMinutes * 60;
        }),
      );
    } catch (err) {
      if (err instanceof RefreshTokenReuseDetectedException) {
        await this.markAllSessionsRevoked(err.userId, err.tenantId, "TOKEN_REUSE_DETECTED");
      }
      throw err;
    }

    return tenantContextStorage.run({ tenantId: rotated.tenantId }, async () => {
      await this.prisma.withRls((tx) =>
        tx.userSession.update({
          where: { id: rotated.sessionId },
          data: { sessionTokenHash: hashForAudit(rotated.refreshToken) },
        }),
      );

      const accessToken = this.signAccessToken({
        sub: rotated.userId,
        tenant_id: rotated.tenantId,
        scope_roles: [],
        sid: rotated.sessionId,
      });

      return { accessToken, refreshToken: rotated.refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
    });
  }

  /** POST /auth/logout — revoke sesi milik caller saja. */
  async logout(userId: string, tenantId: string, sessionId: string): Promise<void> {
    await this.refreshTokenService.revokeSession(userId, sessionId);
    await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls((tx) =>
        tx.userSession.update({
          where: { id: sessionId },
          data: { revoked: true, revokedReason: "USER_LOGOUT", logoutAt: new Date() },
        }),
      ),
    );
  }

  /** POST /auth/logout-all — acceptance criterion task 0.6. */
  async logoutAll(userId: string, tenantId: string): Promise<void> {
    await this.refreshTokenService.revokeAllForUser(userId);
    await this.markAllSessionsRevoked(userId, tenantId, "USER_LOGOUT");
  }

  /** POST /auth/mfa/setup (protected) — generate secret baru, simpan
   * TERENKRIPSI, TAPI mfaEnabled masih false sampai dikonfirmasi (confirmMfa)
   * dengan satu kode valid — mencegah user "terkunci" MFA aktif sebelum
   * terbukti authenticator app-nya benar ter-setup. */
  async setupMfa(userId: string, tenantId: string): Promise<{ secret: string; provisioningUri: string }> {
    const secret = this.mfaService.generateSecret();
    const encrypted = this.mfaService.encryptSecret(secret);

    const email = await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: { mfaSecretEncrypted: encrypted },
        });
        return user.email;
      }),
    );

    return { secret, provisioningUri: this.mfaService.getProvisioningUri(email, secret) };
  }

  /** POST /auth/mfa/confirm (protected) — kode pertama valid mengaktifkan
   * MFA (mfaEnabled=true). */
  async confirmMfa(userId: string, tenantId: string, totpCode: string): Promise<void> {
    await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user?.mfaSecretEncrypted) {
          throw new UnauthorizedException("MFA belum di-setup — panggil /auth/mfa/setup terlebih dahulu.");
        }
        const secret = this.mfaService.decryptSecret(user.mfaSecretEncrypted);
        if (!this.mfaService.verifyToken(secret, totpCode)) {
          throw new UnauthorizedException("Kode MFA tidak valid.");
        }
        await tx.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
      }),
    );
  }

  private async markAllSessionsRevoked(userId: string, tenantId: string, reason: string): Promise<void> {
    await tenantContextStorage.run({ tenantId }, () =>
      this.prisma.withRls((tx) =>
        tx.userSession.updateMany({
          where: { userId, revoked: false },
          data: { revoked: true, revokedReason: reason, logoutAt: new Date() },
        }),
      ),
    );
  }

  private signAccessToken(payload: AccessTokenPayload): string {
    return this.tokenService.signAccessToken(payload);
  }
}

// user_sessions.session_token_hash = jejak audit "refresh token AKTIF
// terakhir" (PRD Modul 02 §11 — tidak pernah plaintext). Redis
// (RefreshTokenService) tetap satu-satunya mekanisme ENFORCEMENT revocation;
// kolom ini murni audit trail DB, bukan dipakai untuk validasi.
function hashForAudit(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Task 0.8 — pengganti placeholder users.isSysadmin (task 0.7, sudah
// dipensiunkan). Query LANGSUNG pakai tx yang sama dari login() — SENGAJA
// tidak lewat RbacModule/PermissionService supaya tidak nesting
// $transaction kedua di dalam transaksi login() yang sudah berjalan.
// Akibatnya: AuthModule dan RbacModule tidak saling import sama sekali.
async function isSuperAdminPlatform(
  tx: Prisma.TransactionClient,
  userId: string,
  tenantId: string,
): Promise<boolean> {
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
