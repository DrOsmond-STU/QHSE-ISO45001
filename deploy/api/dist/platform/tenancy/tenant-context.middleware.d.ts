import { NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { AccessTokenClaims } from "../auth/token.service";
export declare class TenantContextMiddleware implements NestMiddleware {
    use(req: Request & {
        jwtClaims?: AccessTokenClaims;
    }, _res: Response, next: NextFunction): void;
}
