import { ArrayNotEmpty, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class PresignAttachmentDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(500 * 1024 * 1024) // 500MB — batas atas absolut permintaan (DEFAULT_MAX_FILE_SIZE_BYTES layanan bisa lebih ketat)
  fileSize!: number;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsUUID()
  entityId!: string;

  // TDD §11 — "whitelist ekstensi per konteks (mis. foto inspeksi: image
  // only; dokumen DMS: PDF/DOCX/XLSX)". Belum ada modul domain (Phase 0)
  // yang memanggil ini, jadi opsional — caller Phase 1+ menyuplai sesuai
  // konteksnya sendiri, fallback ke whitelist platform generik kalau kosong.
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  allowedMimeTypes?: string[];
}
