"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDms = seedDms;
const node_crypto_1 = require("node:crypto");
const document_category_service_1 = require("../../src/modules/domains/dms/document-category.service");
const document_distribution_service_1 = require("../../src/modules/domains/dms/document-distribution.service");
const document_service_1 = require("../../src/modules/domains/dms/document.service");
const document_version_service_1 = require("../../src/modules/domains/dms/document-version.service");
const read_acknowledgement_service_1 = require("../../src/modules/domains/dms/read-acknowledgement.service");
const tenant_context_1 = require("../../src/platform/tenancy/tenant-context");
const context_1 = require("./context");
const shared_1 = require("./shared");
const ENTITY_TYPE = "DOCUMENT_VERSION";
async function seedDms(app, adminPrisma, ctx) {
    const categoryService = app.get(document_category_service_1.DocumentCategoryService);
    const documentService = app.get(document_service_1.DocumentService);
    const versionService = app.get(document_version_service_1.DocumentVersionService);
    const distributionService = app.get(document_distribution_service_1.DocumentDistributionService);
    const ackService = app.get(read_acknowledgement_service_1.ReadAcknowledgementService);
    const controller = (0, context_1.actor)(ctx, "DOCUMENT_CONTROLLER");
    const owner = (0, context_1.actor)(ctx, "SUPERVISOR");
    const hseManager = (0, context_1.actor)(ctx, "HSE_MANAGER");
    const run = (userId, fn) => tenant_context_1.tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);
    const sopCategory = await run(controller.id, () => categoryService.create({ name: "Prosedur Operasi Standar", code: "SOP" }));
    const policyCategory = await run(controller.id, () => categoryService.create({ name: "Kebijakan Perusahaan", code: "POL" }));
    async function newVersionWithFile(documentId, actorUserId, fileName) {
        const documentVersionId = (0, node_crypto_1.randomUUID)();
        const attachmentId = await (0, shared_1.uploadDemoFile)(app, ctx.tenantId, actorUserId, {
            entityType: ENTITY_TYPE,
            entityId: documentVersionId,
            fileName,
        });
        return run(actorUserId, () => versionService.createVersion({ documentId, attachmentId }));
    }
    async function submitAndApproveFull(documentId, fileName) {
        const version = await newVersionWithFile(documentId, controller.id, fileName);
        const submitted = await run(controller.id, () => versionService.submitForApproval(version.id));
        await (0, shared_1.actOnNextPendingTask)(app, adminPrisma, ctx.tenantId, submitted.workflowInstanceId, "APPROVE");
        await (0, shared_1.actOnNextPendingTask)(app, adminPrisma, ctx.tenantId, submitted.workflowInstanceId, "APPROVE");
        return version.id;
    }
    // 1. DRAFT murni — belum pernah diajukan review.
    await run(controller.id, () => documentService.createDocument({
        title: "SOP Penanganan Tumpahan Minyak (Draft)",
        documentType: "SOP",
        documentCategoryId: sopCategory.id,
        ownerUserId: owner.id,
        reviewCycleMonths: 12,
    }));
    // 2. PUBLISHED penuh + distribusi ALL_TENANT + acknowledgement campur.
    const publishedDoc = await run(controller.id, () => documentService.createDocument({
        title: "SOP Izin Kerja Panas (Hot Work Permit)",
        documentType: "SOP",
        documentCategoryId: sopCategory.id,
        ownerUserId: owner.id,
        reviewCycleMonths: 12,
    }));
    await submitAndApproveFull(publishedDoc.id, "sop-izin-kerja-panas-v1.pdf");
    const publishedVersion = await adminPrisma.documentVersion.findFirstOrThrow({ where: { documentId: publishedDoc.id, status: "PUBLISHED" } });
    const distribution = await run(controller.id, () => distributionService.createDistribution({
        documentId: publishedDoc.id,
        documentVersionId: publishedVersion.id,
        distributionTargetType: "ALL_TENANT",
        requiresAcknowledgement: true,
        acknowledgementDueDays: 14,
    }));
    // Sebagian user acknowledge, sisanya sengaja dibiarkan PENDING/VIEWED —
    // demo lebih realistis drpd 100% selesai.
    // BR-04 — IN_APP_CLICK TIDAK bisa langsung PENDING->ACKNOWLEDGED, WAJIB
    // lewat VIEWED dulu (validateAcknowledgementTransition()).
    const ackLogs = await adminPrisma.readAcknowledgementLog.findMany({ where: { documentDistributionId: distribution.id } });
    for (const log of ackLogs.slice(0, Math.ceil(ackLogs.length * 0.6))) {
        await run(log.userId, () => ackService.markViewed(log.id));
        await run(log.userId, () => ackService.acknowledge(log.id, "IN_APP_CLICK"));
    }
    for (const log of ackLogs.slice(Math.ceil(ackLogs.length * 0.6), Math.ceil(ackLogs.length * 0.8))) {
        await run(log.userId, () => ackService.markViewed(log.id));
    }
    // 3. IN_REVIEW — baru approve stage 1 (Document Owner), stage 2 HSE
    // Manager MASIH menunggu (skenario "sedang diproses").
    const inReviewDoc = await run(controller.id, () => documentService.createDocument({
        title: "SOP Kerja di Ketinggian (Working at Height)",
        documentType: "SOP",
        documentCategoryId: sopCategory.id,
        ownerUserId: owner.id,
        reviewCycleMonths: 12,
    }));
    const inReviewVersion = await newVersionWithFile(inReviewDoc.id, controller.id, "sop-kerja-ketinggian-v1.pdf");
    const inReviewSubmitted = await run(controller.id, () => versionService.submitForApproval(inReviewVersion.id));
    await (0, shared_1.actOnNextPendingTask)(app, adminPrisma, ctx.tenantId, inReviewSubmitted.workflowInstanceId, "APPROVE");
    // 4. PUBLISHED dgn 2 versi (BR-03 supersede) — kebijakan yang sudah
    // direvisi sekali.
    const revisedDoc = await run(controller.id, () => documentService.createDocument({
        title: "Kebijakan K3 Perusahaan",
        documentType: "POLICY",
        documentCategoryId: policyCategory.id,
        ownerUserId: owner.id,
        reviewCycleMonths: 24,
    }));
    await submitAndApproveFull(revisedDoc.id, "kebijakan-k3-v1.pdf");
    await submitAndApproveFull(revisedDoc.id, "kebijakan-k3-v2-revisi.pdf");
    // 5. Ditolak Stage 1 -> kembali DRAFT.
    const rejectedDoc = await run(controller.id, () => documentService.createDocument({
        title: "SOP Bekerja di Ruang Terbatas (Confined Space) — draf awal",
        documentType: "SOP",
        documentCategoryId: sopCategory.id,
        ownerUserId: owner.id,
        reviewCycleMonths: 12,
    }));
    const rejectedVersion = await newVersionWithFile(rejectedDoc.id, controller.id, "sop-confined-space-draft.pdf");
    const rejectedSubmitted = await run(controller.id, () => versionService.submitForApproval(rejectedVersion.id));
    await (0, shared_1.actOnNextPendingTask)(app, adminPrisma, ctx.tenantId, rejectedSubmitted.workflowInstanceId, "REJECT", "Prosedur isolasi gas belum lengkap, mohon dilengkapi sesuai checklist LOTO.");
    // eslint-disable-next-line no-console
    console.log("  DMS: 2 kategori, 5 dokumen (1 draft, 1 published+distribusi+ack, 1 in-review, 1 published-2-versi, 1 rejected).");
}
