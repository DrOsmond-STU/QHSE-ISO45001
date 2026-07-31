import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

// Pagination DTO generik dipakai seluruh controller GET-list read-only
// (task "demo API read controllers") — pola SAMA ListNotificationsQueryDto
// (notification.controller.ts, satu-satunya presedan HTTP controller domain
// sebelum ini), page/limit only (tanpa filter status/tanggal per-modul —
// scope MINIMAL, sekadar cukup utk demo Postman browse data, bukan REST
// API penuh dgn filtering/sorting).
export class ListQueryDto {
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
}
