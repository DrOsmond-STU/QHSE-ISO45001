import { IsIn, IsString, ValidateIf } from "class-validator";

export type GrantType = "authorization_code" | "refresh_token";

// POST /auth/token — dua grant type dalam satu endpoint (konvensi OAuth2
// token endpoint). Refresh token grant TIDAK butuh field body — token-nya
// dibaca dari httpOnly cookie (lihat auth.controller.ts, CSRF stance §8 plan).
export class TokenExchangeDto {
  @IsIn(["authorization_code", "refresh_token"])
  grantType!: GrantType;

  @ValidateIf((o: TokenExchangeDto) => o.grantType === "authorization_code")
  @IsString()
  code?: string;

  @ValidateIf((o: TokenExchangeDto) => o.grantType === "authorization_code")
  @IsString()
  codeVerifier?: string;
}
