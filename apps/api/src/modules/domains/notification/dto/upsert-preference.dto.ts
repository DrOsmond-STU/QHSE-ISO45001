import { NotificationChannelCode, NotificationDeliveryMode } from "@prisma/client";
import { IsBoolean, IsIn, IsOptional, IsString, Matches } from "class-validator";

const CHANNEL_CODES: NotificationChannelCode[] = ["IN_APP", "EMAIL", "WHATSAPP", "TELEGRAM"];
const DELIVERY_MODES: NotificationDeliveryMode[] = ["REAL_TIME", "DIGEST_DAILY", "DIGEST_WEEKLY"];

export class UpsertPreferenceDto {
  @IsString()
  eventCategory!: string;

  // IN_APP diterima di sini SUPAYA request-nya menghasilkan pesan error
  // BR-02 yang jelas dari service layer (BadRequestException), bukan
  // ditolak diam-diam di validasi DTO tanpa penjelasan.
  @IsIn(CHANNEL_CODES)
  channelCode!: NotificationChannelCode;

  @IsBoolean()
  isEnabled!: boolean;

  @IsOptional()
  @IsIn(DELIVERY_MODES)
  deliveryMode?: NotificationDeliveryMode;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "quietHoursStart harus format HH:mm." })
  quietHoursStart?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "quietHoursEnd harus format HH:mm." })
  quietHoursEnd?: string;
}
