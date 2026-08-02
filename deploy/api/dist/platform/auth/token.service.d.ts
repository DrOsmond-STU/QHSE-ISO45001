import { JwtService } from "@nestjs/jwt";
export interface AccessTokenClaims {
    sub: string;
    tenant_id: string;
    scope_roles: string[];
    sid: string;
    iat: number;
    exp: number;
}
export type AccessTokenPayload = Pick<AccessTokenClaims, "sub" | "tenant_id" | "scope_roles" | "sid">;
export declare class TokenService {
    private readonly jwtService;
    constructor(jwtService: JwtService);
    signAccessToken(payload: AccessTokenPayload): string;
    verifyAccessToken(token: string): AccessTokenClaims;
    decodeAccessToken(token: string): AccessTokenClaims | null;
}
