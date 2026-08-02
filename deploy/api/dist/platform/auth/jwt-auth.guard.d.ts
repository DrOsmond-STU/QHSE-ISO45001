import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RefreshTokenService } from "./refresh-token.service";
import { TokenService } from "./token.service";
export declare class JwtAuthGuard implements CanActivate {
    private readonly tokenService;
    private readonly refreshTokenService;
    private readonly reflector;
    constructor(tokenService: TokenService, refreshTokenService: RefreshTokenService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
