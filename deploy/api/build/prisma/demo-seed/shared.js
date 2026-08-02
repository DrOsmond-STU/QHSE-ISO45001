"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDemoFile = uploadDemoFile;
exports.actOnNextPendingTask = actOnNextPendingTask;
exports.approveAllPendingStages = approveAllPendingStages;
const node_crypto_1 = require("node:crypto");
const attachment_scan_service_1 = require("../../src/platform/attachment/attachment-scan.service");
const attachment_service_1 = require("../../src/platform/attachment/attachment.service");
const object_storage_service_1 = require("../../src/platform/attachment/object-storage.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const workflow_engine_service_1 = require("../../src/platform/workflow-engine/workflow-engine.service");
/** Upload+confirm+scan SATU file dummy (isi teks placeholder, bukan PDF/
 * gambar sungguhan — cukup utk attachments row + presigned GET/PUT genuinely
 * berfungsi di demo, bukan cuma metadata kosong). */
async function uploadDemoFile(app, tenantId, actorUserId, params) {
    const attachmentService = app.get(attachment_service_1.AttachmentService);
    const storage = app.get(object_storage_service_1.ObjectStorageService);
    const scanService = app.get(attachment_scan_service_1.AttachmentScanService);
    const mimeType = params.mimeType ?? "application/pdf";
    const buffer = Buffer.from(params.textContent ?? `Dokumen demo QHSE — ${params.fileName} — ${(0, node_crypto_1.randomUUID)()}`);
    return tenant_context_1.tenantContextStorage.run({ tenantId, userId: actorUserId }, async () => {
        const presigned = await attachmentService.presign({
            fileName: params.fileName,
            mimeType,
            fileSize: buffer.length,
            entityType: params.entityType,
            entityId: params.entityId,
        });
        await storage.putObject(presigned.storageKey, buffer, mimeType);
        const confirmed = await attachmentService.confirm({ attachmentId: presigned.attachmentId, storageKey: presigned.storageKey, fileName: params.fileName, entityType: params.entityType, entityId: params.entityId }, actorUserId);
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
async function actOnNextPendingTask(app, adminPrisma, tenantId, workflowInstanceId, action, comment) {
    const workflowEngineService = app.get(workflow_engine_service_1.WorkflowEngineService);
    const task = await adminPrisma.workflowTask.findFirst({ where: { instanceId: workflowInstanceId, status: "PENDING" } });
    if (!task || !task.assignedTo)
        return false;
    const actorUserId = task.assignedTo;
    await tenant_context_1.tenantContextStorage.run({ tenantId, userId: actorUserId }, () => workflowEngineService.actOnTask(task.id, action, comment, actorUserId));
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
async function approveAllPendingStages(app, adminPrisma, tenantId, workflowInstanceId, maxStages = 5) {
    const workflowEngineService = app.get(workflow_engine_service_1.WorkflowEngineService);
    for (let i = 0; i < maxStages; i++) {
        const task = await adminPrisma.workflowTask.findFirst({ where: { instanceId: workflowInstanceId, status: "PENDING" } });
        if (!task || !task.assignedTo)
            return;
        const actorUserId = task.assignedTo;
        await tenant_context_1.tenantContextStorage.run({ tenantId, userId: actorUserId }, () => workflowEngineService.actOnTask(task.id, "APPROVE", undefined, actorUserId));
        await new Promise((r) => setTimeout(r, 350));
    }
}
