import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { RequestUser } from "./current-user.decorator";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { RefreshTokenService } from "./refresh-token.service";
import { AccessTokenClaims, TokenService } from "./token.service";

// Guard global (didaftarkan APP_GUARD di app.module.ts) — fail closed by
// default. Verifikasi signature+exp JWT (TokenService) DAN cek keberadaan
// sesi di Redis (RefreshTokenService.isSessionAlive) supaya revocation
// (logout/logout-all/reuse-detect) langsung berlaku, bukan menunggu exp 15
// menit (TDD §8.1 — Redis dipakai justru karena JWT stateless tidak bisa
// di-revoke langsung).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<
      Request & { user?: RequestUser; jwtClaims?: AccessTokenClaims }
    >();

    // tenant-context.middleware.ts (global) sudah verifikasi+decode token yang
    // sama sebelum guard ini jalan — pakai hasilnya kalau ada supaya tidak
    // verify JWT dua kali per request.
    let claims = req.jwtClaims;
    if (!claims) {
      const authHeader = req.header("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedException("Access token tidak ditemukan.");
      }
      try {
        claims = this.tokenService.verifyAccessToken(authHeader.slice("Bearer ".length));
      } catch {
        throw new UnauthorizedException("Access token tidak valid atau kedaluwarsa.");
      }
    }

    const alive = await this.refreshTokenService.isSessionAlive(claims.sub, claims.sid);
    if (!alive) {
      throw new UnauthorizedException("Sesi telah di-revoke.");
    }

    req.user = {
      userId: claims.sub,
      tenantId: claims.tenant_id,
      sessionId: claims.sid,
      scopeRoles: claims.scope_roles,
    };
    return true;
  }
}
