import { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AttachmentScanService } from "../../src/platform/attachment/attachment-scan.service";
import { AttachmentService } from "../../src/platform/attachment/attachment.service";
import { ObjectStorageService } from "../../src/platform/attachment/object-storage.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { ROLE_CODES, seedRbacBaseline } from "../../prisma/seed-rbac-baseline";
import { adminPrisma } from "../auth/test-helpers";

export { adminPrisma, createTestApp, flushTestRedis, seedTenantFixture } from "../auth/test-helpers";
export type { TenantFixture } from "../auth/test-helpers";

const PDF_MIME = "application/pdf";
export const DMS_ATTACHMENT_ENTITY_TYPE = "DOCUMENT_VERSION";

export interface SeededUser {
  id: string;
  email: string;
}

export async function seedUserInTenant(tenantId: string, label = "Test User"): Promise<SeededUser> {
  const email = `${label.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@qhse.local`;
  const user = await adminPrisma.user.create({ data: { tenantId, email, fullName: label, status: "ACTIVE" } });
  return { id: user.id, email: user.email };
}

/** roleCode ROLE_CODES key (mis. "DOCUMENT_CONTROLLER"/"HSE_MANAGER") —
 * permission dms.* tidak divalidasi lewat controller HTTP (belum ada, lihat
 * banner comment dms.module.ts), role assignment di sini murni utk
 * konsistensi fixture (mis. dipakai lagi begitu controller ada nanti),
 * BUKAN prasyarat fungsional test service-level manapun di folder ini. */
export async function assignRole(tenantId: string, userId: string, roleCode: string): Promise<void> {
  await seedRbacBaseline(adminPrisma);
  const role = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode } });
  await adminPrisma.userRole.create({ data: { tenantId, userId, roleId: role.id, scopeType: "TENANT", scopeId: null } });
}

export interface SeededCategory {
  id: string;
  code: string;
}

export async function seedDocumentCategory(tenantId: string, actorUserId: string, code = "SOP"): Promise<SeededCategory> {
  const category = await adminPrisma.documentCategory.create({
    data: { tenantId, name: `Kategori ${code}`, code: `${code}-${randomUUID().slice(0, 6)}`, createdBy: actorUserId, updatedBy: actorUserId },
  });
  return { id: category.id, code: category.code };
}

/**
 * Simulasi alur presign->upload->confirm attachment (0.12) APA ADANYA utk
 * document_versions — pola PERSIS uploadAndConfirmExcel() (1.6,
 * test/system-administration/data-import.integration-spec.ts):
 * entityId=documentVersionId yang SUDAH disepakati SEBELUM baris
 * document_versions dibuat (client-proposed-id, lihat banner comment
 * DocumentVersionService.createVersion()).
 */
export async function uploadAndConfirmDocumentFile(
  app: INestApplication,
  tenantId: string,
  actorUserId: string,
  documentVersionId: string,
  scanResult: "CLEAN" | "INFECTED" = "CLEAN",
): Promise<string> {
  const attachmentService = app.get(AttachmentService);
  const storage = app.get(ObjectStorageService);
  const scanService = app.get(AttachmentScanService);
  const buffer = Buffer.from(`%PDF-1.4 fixture content ${randomUUID()}`);

  return tenantContextStorage.run({ tenantId, userId: actorUserId }, async () => {
    const fileName = "sop-document.pdf";
    const presigned = await attachmentService.presign({
      fileName,
      mimeType: PDF_MIME,
      fileSize: buffer.length,
      entityType: DMS_ATTACHMENT_ENTITY_TYPE,
      entityId: documentVersionId,
    });
    await storage.putObject(presigned.storageKey, buffer, PDF_MIME);
    const confirmed = await attachmentService.confirm(
      { attachmentId: presigned.attachmentId, storageKey: presigned.storageKey, fileName, entityType: DMS_ATTACHMENT_ENTITY_TYPE, entityId: documentVersionId },
      actorUserId,
    );
    await scanService.processScanJob({
      tenantId,
      attachmentId: confirmed.attachmentId,
      storageKey: presigned.storageKey,
      mimeType: PDF_MIME,
    });
    if (scanResult === "INFECTED") {
      await adminPrisma.attachment.update({ where: { id: confirmed.attachmentId }, data: { scanStatus: "INFECTED" } });
    }
    return confirmed.attachmentId;
  });
}

export const ROLE_CODES_DMS = ROLE_CODES;
