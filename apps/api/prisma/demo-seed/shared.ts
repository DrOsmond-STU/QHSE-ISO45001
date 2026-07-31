// Helper dipakai LINTAS seluruh modul demo-seed — pola presign->upload->
// confirm attachment (pola PERSIS uploadAndConfirmDocumentFile()
// test/dms/test-helpers.ts) + wrapper actOnTask() workflow (pola PERSIS
// pemakaian WorkflowEngineService di seluruh integration-spec.ts).
import { INestApplicationContext } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AttachmentScanService } from "../../src/platform/attachment/attachment-scan.service";
import { AttachmentService } from "../../src/platform/attachment/attachment.service";
import { ObjectStorageService } from "../../src/platform/attachment/object-storage.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";

/** Upload+confirm+scan SATU file dummy (isi teks placeholder, bukan PDF/
 * gambar sungguhan — cukup utk attachments row + presigned GET/PUT genuinely
 * berfungsi di demo, bukan cuma metadata kosong). */
export async function uploadDemoFile(
  app: INestApplicationContext,
  tenantId: string,
  actorUserId: string,
  params: { entityType: string; entityId: string; fileName: string; mimeType?: string; textContent?: string },
): Promise<string> {
  const attachmentService = app.get(AttachmentService);
  const storage = app.get(ObjectStorageService);
  const scanService = app.get(AttachmentScanService);
  const mimeType = params.mimeType ?? "application/pdf";
  const buffer = Buffer.from(params.textContent ?? `Dokumen demo QHSE — ${params.fileName} — ${randomUUID()}`);

  return tenantContextStorage.run({ tenantId, userId: actorUserId }, async () => {
    const presigned = await attachmentService.presign({
      fileName: params.fileName,
      mimeType,
      fileSize: buffer.length,
      entityType: params.entityType,
      entityId: params.entityId,
    });
    await storage.putObject(presigned.storageKey, buffer, mimeType);
    const confirmed = await attachmentService.confirm(
      { attachmentId: presigned.attachmentId, storageKey: presigned.storageKey, fileName: params.fileName, entityType: params.entityType, entityId: params.entityId },
      actorUserId,
    );
    await scanService.processScanJob({ tenantId, attachmentId: confirmed.attachmentId, storageKey: presigned.storageKey, mimeType });
    return confirmed.attachmentId;
  });
}

/** Cari SATU workflow_task PENDING milik instance tsb lalu actOnTask() —
 * actor SELALU diresolusi dari `task.assignedTo` SENDIRI (BUKAN ditebak
 * pemanggil) — ROLE_IN_SCOPE (0.9) TENANT-WIDE sengaja (lihat banner
 * comment ApproverResolutionService), jadi kalau >1 user pegang role yang
 * sama, assignedTo BELUM TENTU orang yang pemanggil kira; menebak salah
 * berarti ForbiddenException "Anda bukan assignee task ini" — ditemukan
 * empiris menulis modul risk-management (2 SUPERVISOR demo). Kembalikan
 * null kalau tidak ada task PENDING (instance sudah selesai/tidak pernah
 * ada) drpd throw — pemanggil demo boleh cuek kalau memang sengaja tidak
 * ada langkah lanjut. */
export async function actOnNextPendingTask(
  app: INestApplicationContext,
  adminPrisma: PrismaClient,
  tenantId: string,
  workflowInstanceId: string,
  action: "APPROVE" | "REJECT",
  comment?: string,
): Promise<boolean> {
  const workflowEngineService = app.get(WorkflowEngineService);
  const task = await adminPrisma.workflowTask.findFirst({ where: { instanceId: workflowInstanceId, status: "PENDING" } });
  if (!task || !task.assignedTo) return false;
  const actorUserId = task.assignedTo;
  await tenantContextStorage.run({ tenantId, userId: actorUserId }, () =>
    workflowEngineService.actOnTask(task.id, action, comment, actorUserId),
  );
  // DocumentWorkflowCompletionListener-style listener bereaksi ASYNC
  // (fire-and-forget) ke WORKFLOW_INSTANCE_COMPLETED_EVENT — beri jeda
  // singkat spy efek sampingnya (numbering/status turunan) selesai sebelum
  // baris seed berikutnya bergantung padanya.
  await new Promise((r) => setTimeout(r, 350));
  return true;
}

/** Approve SEMUA stage tersisa satu instance workflow berturut-turut,
 * masing² actor diresolusi dari `resolveActor(pendingTask)` (biasanya
 * berdasar assignedTo) — dipakai kalau demo TIDAK butuh berhenti di
 * tengah (mayoritas skenario "sudah selesai/disetujui"). */
export async function approveAllPendingStages(
  app: INestApplicationContext,
  adminPrisma: PrismaClient,
  tenantId: string,
  workflowInstanceId: string,
  maxStages = 5,
): Promise<void> {
  const workflowEngineService = app.get(WorkflowEngineService);
  for (let i = 0; i < maxStages; i++) {
    const task = await adminPrisma.workflowTask.findFirst({ where: { instanceId: workflowInstanceId, status: "PENDING" } });
    if (!task || !task.assignedTo) return;
    const actorUserId = task.assignedTo;
    await tenantContextStorage.run({ tenantId, userId: actorUserId }, () =>
      workflowEngineService.actOnTask(task.id, "APPROVE", undefined, actorUserId),
    );
    await new Promise((r) => setTimeout(r, 350));
  }
}
