import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RequestUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { MfaConfirmDto } from "./dto/mfa-confirm.dto";
import { TokenExchangeDto } from "./dto/token-exchange.dto";
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(tenantId: string | undefined, dto: LoginDto): Promise<{
        data: {
            code: string;
            state?: string;
        };
    }>;
    token(dto: TokenExchangeDto, req: Request, res: Response): Promise<{
        data: {
            accessToken: string;
            tokenType: string;
            expiresIn: number;
        };
    }>;
    logout(user: RequestUser, res: Response): Promise<void>;
    logoutAll(user: RequestUser, res: Response): Promise<void>;
    setupMfa(user: RequestUser): Promise<{
        data: {
            secret: string;
            provisioningUri: string;
        };
    }>;
    confirmMfa(user: RequestUser, dto: MfaConfirmDto): Promise<void>;
}
