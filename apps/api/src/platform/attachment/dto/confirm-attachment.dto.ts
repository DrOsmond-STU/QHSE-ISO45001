import { IsNotEmpty, IsString, IsUUID } from "class-validator";

// presign() STATELESS (tidak nulis DB, lihat banner comment "Task 0.12"
// schema.prisma) — confirm() perlu client echo balik seluruh konteks yang
// diterima dari presign() supaya server bisa merekonstruksi & verifikasi
// (lihat AttachmentService.confirm(): storageKey WAJIB cocok hasil
// buildStorageKey(tenantId, attachmentId, fileName) ulang, bukan dipercaya
// mentah dari client).
export class ConfirmAttachmentDto {
  @IsUUID()
  attachmentId!: string;

  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsUUID()
  entityId!: string;
}
