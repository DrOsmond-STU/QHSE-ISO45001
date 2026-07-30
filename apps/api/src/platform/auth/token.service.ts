import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ACCESS_TOKEN_TTL_SECONDS } from "./auth.constants";

// Klaim minimal JWT access token (TDD §8.1): sub (user_id), tenant_id,
// scope_roles (ringkas, bukan seluruh permission — detail di-resolve
// server-side task 0.8 RBAC), sid (session_id — dipakai jwt-auth.guard
// untuk cek keberadaan sesi di Redis, bukan cuma percaya exp JWT).
export interface AccessTokenClaims {
  sub: string;
  tenant_id: string;
  scope_roles: string[];
  sid: string;
  iat: number;
  exp: number;
}

export type AccessTokenPayload = Pick<AccessTokenClaims, "sub" | "tenant_id" | "scope_roles" | "sid">;

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    return this.jwtService.verify<AccessTokenClaims>(token);
  }

  decodeAccessToken(token: string): AccessTokenClaims | null {
    return this.jwtService.decode(token) as AccessTokenClaims | null;
  }
}
