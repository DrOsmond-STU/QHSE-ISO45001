import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

// Authorization Code Flow + PKCE (TDD §8.1) — login form internal pun lewat
// alur ini, bukan cuma SSO eksternal. codeChallenge = base64url(SHA256(verifier)),
// panjang tetap 43 karakter (digest SHA-256 32 byte, base64url tanpa padding).
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsString()
  @Length(43, 43)
  codeChallenge!: string;

  @IsIn(["S256"])
  codeChallengeMethod!: "S256";

  @IsOptional()
  @IsString()
  state?: string;

  // Task 0.7 — kode TOTP 6 digit, dikirim di submit KEDUA login yang sama
  // setelah server balas "MFA_REQUIRED" pada submit pertama (password saja).
  @IsOptional()
  @Matches(/^\d{6}$/, { message: "totpCode harus 6 digit angka." })
  totpCode?: string;
}
