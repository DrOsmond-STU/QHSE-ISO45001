import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

// `@Type(() => Boolean)` TIDAK aman utk query string "true"/"false" —
// `Boolean("false")` di JS adalah `true` (string non-kosong apa pun
// truthy). `@Transform` eksplisit di sini menghindari jebakan itu.
function toBoolean({ value }: { value: unknown }): unknown {
  if (typeof value !== "string") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

export class ListNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  unreadOnly?: boolean;
}
