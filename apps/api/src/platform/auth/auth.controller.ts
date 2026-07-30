import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser, RequestUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { MfaConfirmDto } from "./dto/mfa-confirm.dto";
import { TokenExchangeDto } from "./dto/token-exchange.dto";
import { Public } from "./public.decorator";
import { RateLimitGuard } from "./rate-limit.guard";

// Cookie httpOnly+Secure+SameSite=Strict untuk refresh token (CSRF stance §8
// plan) — path dipersempit ke /auth/token supaya browser cuma kirim cookie
// ini ke endpoint yang memang butuh, bukan ke seluruh domain.
const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_PATH = "/auth/token";

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Pre-auth — tenant BELUM diketahui dari JWT (belum ada), lihat
  // auth.service.ts#login & plan §5. RateLimitGuard: TDD §16 endpoint sensitif.
  @Public()
  @UseGuards(RateLimitGuard)
  @Post("login")
  async login(@Headers("x-tenant-id") tenantId: string | undefined, @Body() dto: LoginDto) {
    if (!tenantId) {
      throw new BadRequestException("Header x-tenant-id wajib diisi.");
    }
    const result = await this.authService.login(tenantId, dto);
    return { data: result };
  }

  @Public()
  @Post("token")
  async token(@Body() dto: TokenExchangeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (dto.grantType === "authorization_code") {
      if (!dto.code || !dto.codeVerifier) {
        throw new BadRequestException("code dan codeVerifier wajib untuk grant authorization_code.");
      }
      const pair = await this.authService.exchangeAuthorizationCode(dto.code, dto.codeVerifier, {
        ipAddress: req.ip,
        userAgent: req.header("user-agent"),
      });
      setRefreshCookie(res, pair.refreshToken);
      return { data: { accessToken: pair.accessToken, tokenType: "Bearer", expiresIn: pair.expiresIn } };
    }

    const presented = (req as Request & { cookies?: Record<string, string> }).cookies?.[REFRESH_COOKIE_NAME];
    if (!presented) {
      throw new UnauthorizedException("Refresh token tidak ditemukan.");
    }
    const pair = await this.authService.exchangeRefreshToken(presented);
    setRefreshCookie(res, pair.refreshToken);
    return { data: { accessToken: pair.accessToken, tokenType: "Bearer", expiresIn: pair.expiresIn } };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.logout(user.userId, user.tenantId, user.sessionId);
    clearRefreshCookie(res);
  }

  // Acceptance criterion task 0.6 — "logout-all-device berfungsi".
  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.logoutAll(user.userId, user.tenantId);
    clearRefreshCookie(res);
  }

  // Task 0.7 — enrollment MFA. Butuh sesi valid dulu (login TANPA MFA harus
  // sudah pernah berhasil, mis. sebelum sysadmin.mfaEnabled di-set true, atau
  // user non-sysadmin yang belum diwajibkan tenant-nya) — bootstrap sysadmin
  // PERTAMA di provisioning lewat seed script (di luar API), bukan endpoint
  // ini (lihat prisma/seed-auth-dev.ts).
  @Post("mfa/setup")
  async setupMfa(@CurrentUser() user: RequestUser) {
    const result = await this.authService.setupMfa(user.userId, user.tenantId);
    return { data: result };
  }

  @Post("mfa/confirm")
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmMfa(@CurrentUser() user: RequestUser, @Body() dto: MfaConfirmDto): Promise<void> {
    await this.authService.confirmMfa(user.userId, user.tenantId, dto.totpCode);
  }
}
