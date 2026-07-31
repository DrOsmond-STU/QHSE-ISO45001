// Data demo DMS (Modul 03, task 2.1) — 2 kategori, 5 dokumen lintas status
// (DRAFT belum diajukan, IN_REVIEW baru stage-1, PUBLISHED penuh+distribusi+
// acknowledgement campur ACKNOWLEDGED/PENDING, PUBLISHED dgn versi ke-2
// [BR-03 supersede], DRAFT-lagi krn REJECTED) — pola panggilan PERSIS
// test/dms/dms-lifecycle.integration-spec.ts.
import { INestApplicationContext } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { DocumentCategoryService } from "../../src/modules/domains/dms/document-category.service";
import { DocumentDistributionService } from "../../src/modules/domains/dms/document-distribution.service";
import { DocumentService } from "../../src/modules/domains/dms/document.service";
import { DocumentVersionService } from "../../src/modules/domains/dms/document-version.service";
import { ReadAcknowledgementService } from "../../src/modules/domains/dms/read-acknowledgement.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { actor, DemoContext } from "./context";
import { actOnNextPendingTask, uploadDemoFile } from "./shared";

const ENTITY_TYPE = "DOCUMENT_VERSION";

export async function seedDms(app: INestApplicationContext, adminPrisma: PrismaClient, ctx: DemoContext): Promise<void> {
  const categoryService = app.get(DocumentCategoryService);
  const documentService = app.get(DocumentService);
  const versionService = app.get(DocumentVersionService);
  const distributionService = app.get(DocumentDistributionService);
  const ackService = app.get(ReadAcknowledgementService);

  const controller = actor(ctx, "DOCUMENT_CONTROLLER");
  const owner = actor(ctx, "SUPERVISOR");
  const hseManager = actor(ctx, "HSE_MANAGER");

  const run = <T>(userId: string, fn: () => Promise<T>) => tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);

  const sopCategory = await run(controller.id, () => categoryService.create({ name: "Prosedur Operasi Standar", code: "SOP" }));
  const policyCategory = await run(controller.id, () => categoryService.create({ name: "Kebijakan Perusahaan", code: "POL" }));

  async function newVersionWithFile(documentId: string, actorUserId: string, fileName: string) {
    const documentVersionId = randomUUID();
    const attachmentId = await uploadDemoFile(app, ctx.tenantId, actorUserId, {
      entityType: ENTITY_TYPE,
      entityId: documentVersionId,
      fileName,
    });
    return run(actorUserId, () => versionService.createVersion({ documentId, attachmentId }));
  }

  async function submitAndApproveFull(documentId: string, fileName: string) {
    const version = await newVersionWithFile(documentId, controller.id, fileName);
    const submitted = await run(controller.id, () => versionService.submitForApproval(version.id));
    await actOnNextPendingTask(app, adminPrisma, ctx.tenantId, submitted.workflowInstanceId!, "APPROVE");
    await actOnNextPendingTask(app, adminPrisma, ctx.tenantId, submitted.workflowInstanceId!, "APPROVE");
    return version.id;
  }

  // 1. DRAFT murni — belum pernah diajukan review.
  await run(controller.id, () =>
    documentService.createDocument({
      title: "SOP Penanganan Tumpahan Minyak (Draft)",
      documentType: "SOP",
      documentCategoryId: sopCategory.id,
      ownerUserId: owner.id,
      reviewCycleMonths: 12,
    }),
  );

  // 2. PUBLISHED penuh + distribusi ALL_TENANT + acknowledgement campur.
  const publishedDoc = await run(controller.id, () =>
    documentService.createDocument({
      title: "SOP Izin Kerja Panas (Hot Work Permit)",
      documentType: "SOP",
      documentCategoryId: sopCategory.id,
      ownerUserId: owner.id,
      reviewCycleMonths: 12,
    }),
  );
  await submitAndApproveFull(publishedDoc.id, "sop-izin-kerja-panas-v1.pdf");
  const publishedVersion = await adminPrisma.documentVersion.findFirstOrThrow({ where: { documentId: publishedDoc.id, status: "PUBLISHED" } });
  const distribution = await run(controller.id, () =>
    distributionService.createDistribution({
      documentId: publishedDoc.id,
      documentVersionId: publishedVersion.id,
      distributionTargetType: "ALL_TENANT",
      requiresAcknowledgement: true,
      acknowledgementDueDays: 14,
    }),
  );
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
  const inReviewDoc = await run(controller.id, () =>
    documentService.createDocument({
      title: "SOP Kerja di Ketinggian (Working at Height)",
      documentType: "SOP",
      documentCategoryId: sopCategory.id,
      ownerUserId: owner.id,
      reviewCycleMonths: 12,
    }),
  );
  const inReviewVersion = await newVersionWithFile(inReviewDoc.id, controller.id, "sop-kerja-ketinggian-v1.pdf");
  const inReviewSubmitted = await run(controller.id, () => versionService.submitForApproval(inReviewVersion.id));
  await actOnNextPendingTask(app, adminPrisma, ctx.tenantId, inReviewSubmitted.workflowInstanceId!, "APPROVE");

  // 4. PUBLISHED dgn 2 versi (BR-03 supersede) — kebijakan yang sudah
  // direvisi sekali.
  const revisedDoc = await run(controller.id, () =>
    documentService.createDocument({
      title: "Kebijakan K3 Perusahaan",
      documentType: "POLICY",
      documentCategoryId: policyCategory.id,
      ownerUserId: owner.id,
      reviewCycleMonths: 24,
    }),
  );
  await submitAndApproveFull(revisedDoc.id, "kebijakan-k3-v1.pdf");
  await submitAndApproveFull(revisedDoc.id, "kebijakan-k3-v2-revisi.pdf");

  // 5. Ditolak Stage 1 -> kembali DRAFT.
  const rejectedDoc = await run(controller.id, () =>
    documentService.createDocument({
      title: "SOP Bekerja di Ruang Terbatas (Confined Space) — draf awal",
      documentType: "SOP",
      documentCategoryId: sopCategory.id,
      ownerUserId: owner.id,
      reviewCycleMonths: 12,
    }),
  );
  const rejectedVersion = await newVersionWithFile(rejectedDoc.id, controller.id, "sop-confined-space-draft.pdf");
  const rejectedSubmitted = await run(controller.id, () => versionService.submitForApproval(rejectedVersion.id));
  await actOnNextPendingTask(
    app,
    adminPrisma,
    ctx.tenantId,
    rejectedSubmitted.workflowInstanceId!,
    "REJECT",
    "Prosedur isolasi gas belum lengkap, mohon dilengkapi sesuai checklist LOTO.",
  );

  // eslint-disable-next-line no-console
  console.log("  DMS: 2 kategori, 5 dokumen (1 draft, 1 published+distribusi+ack, 1 in-review, 1 published-2-versi, 1 rejected).");
}
