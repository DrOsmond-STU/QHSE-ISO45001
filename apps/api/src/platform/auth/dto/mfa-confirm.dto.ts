import { Matches } from "class-validator";

export class MfaConfirmDto {
  @Matches(/^\d{6}$/, { message: "totpCode harus 6 digit angka." })
  totpCode!: string;
}
