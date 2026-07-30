import { BadRequestException, INestApplication, NotFoundException } from "@nestjs/common";
import { DocumentCategoryService } from "../../src/modules/domains/dms/document-category.service";
import { DocumentDistributionService } from "../../src/modules/domains/dms/document-distribution.service";
import { DocumentReviewScanService } from "../../src/modules/domains/dms/document-review-scan.service";
import { DocumentReviewScheduleService } from "../../src/modules/domains/dms/document-review-schedule.service";
import { DocumentVersionService } from "../../src/modules/domains/dms/document-version.service";
import { DocumentService } from "../../src/modules/domains/dms/document.service";
import { ReadAcknowledgementScanService } from "../../src/modules/domains/dms/read-acknowledgement-scan.service";
import { ReadAcknowledgementService } from "../../src/modules/domains/dms/read-acknowledgement.service";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import {
  adminPrisma,
  assignRole,
  createTestApp,
  flushTestRedis,
  seedDocumentCategory,
  seedTenantFixture,
  seedUserInTenant,
  uploadAndConfirmDocumentFile,
} from "./test-helpers";

/**
 * Task 2.1 (Modul 03 DMS) — cakupan: BR-01 (numbering), BR-02 (current
 * version wajib PUBLISHED), BR-03 (supersede otomatis), BR-04 (acknowledgement
 * transition + SLA overdue), BR-05 (retired/obsolete blokir distribusi
 * baru), BR-06 (review schedule overdue), BR-07 (classification vs target),
 * alur approval 2-stage penuh (CONTEXT_USER Document Owner ->
 * ROLE_IN_SCOPE HSE Manager) via WorkflowEngineService (0.9) SUNGGUHAN
 * (bukan mock), DocumentWorkflowCompletionListener (KONSUMEN PERTAMA
 * WORKFLOW_INSTANCE_COMPLETED_EVENT), path reject, isolasi tenant RLS,
 * kedua scan job (document-review-scan/read-acknowledgement-scan).
 */
describe("DMS — Modul 03 (task 2.1)", () => {
  let app: INestApplication;
  let categoryService: DocumentCategoryService;
  let documentService: DocumentService;
  let versionService: DocumentVersionService;
  let workflowEngineService: WorkflowEngineService;
  let distributionService: DocumentDistributionService;
  let ackService: ReadAcknowledgementService;
  let reviewScheduleService: DocumentReviewScheduleService;
  let documentReviewScanService: DocumentReviewScanService;
  let readAcknowledgementScanService: ReadAcknowledgementScanService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    categoryService = app.get(DocumentCategoryService);
    documentService = app.get(DocumentService);
    versionService = app.get(DocumentVersionService);
    workflowEngineService = app.get(WorkflowEngineService);
    distributionService = app.get(DocumentDistributionService);
    ackService = app.get(ReadAcknowledgementService);
    reviewScheduleService = app.get(DocumentReviewScheduleService);
    documentReviewScanService = app.get(DocumentReviewScanService);
    readAcknowledgementScanService = app.get(ReadAcknowledgementScanService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  /** Setup satu tenant lengkap: Document Controller (submitter) + Document
   * Owner (Stage 1 CONTEXT_USER approver) + HSE Manager (Stage 2
   * ROLE_IN_SCOPE approver) + kategori. */
  async function setupTenant() {
    const fixture = await seedTenantFixture();
    await assignRole(fixture.tenantId, fixture.userId, "DOCUMENT_CONTROLLER");
    const owner = await seedUserInTenant(fixture.tenantId, "Document Owner");
    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    const category = await seedDocumentCategory(fixture.tenantId, fixture.userId);
    return { fixture, owner, hseManager, category };
  }

  async function createDraftVersion(tenantId: string, actorUserId: string, documentId: string) {
    return tenantContextStorage.run({ tenantId, userId: actorUserId }, async () => {
      const version = await versionService.createVersion({ documentId, attachmentId: await createAttachmentForNewVersion(tenantId, actorUserId, documentId) });
      return version;
    });
  }

  /** Client-proposed-id: attachmentId dikonfirmasi dgn entityId = id versi
   * yang BELUM ADA barisnya — createVersion() membaca id itu balik dari
   * attachment.entityId (lihat banner comment service). */
  async function createAttachmentForNewVersion(tenantId: string, actorUserId: string, _documentId: string): Promise<string> {
    const { randomUUID } = await import("node:crypto");
    const documentVersionId = randomUUID();
    return uploadAndConfirmDocumentFile(app, tenantId, actorUserId, documentVersionId);
  }

  describe("DocumentCategoryService", () => {
    it("create() menegakkan unique code per tenant (BR-02-style)", async () => {
      const fixture = await seedTenantFixture();
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        categoryService.create({ name: "SOP Operasional", code: "SOP-DUP" }),
      );
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          categoryService.create({ name: "SOP Operasional Lain", code: "SOP-DUP" }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("DocumentService.createDocument — BR-01 numbering", () => {
    it("document_number ter-generate via NumberingService (module_code=DMS), berbeda tiap dokumen", async () => {
      const { fixture, owner, category } = await setupTenant();

      const doc1 = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({ title: "SOP Izin Kerja", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id }),
      );
      const doc2 = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({ title: "SOP Insiden", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id }),
      );

      expect(doc1.documentNumber).toContain(category.code);
      expect(doc1.documentNumber).not.toBe(doc2.documentNumber);
      expect(doc1.status).toBe("DRAFT");
    });
  });

  describe("Alur approval penuh: submit -> Stage 1 (Document Owner) -> Stage 2 (HSE Manager) -> PUBLISHED", () => {
    it("2-stage approve menghasilkan: version PUBLISHED, document PUBLISHED+currentVersionId terisi, review_schedule dibuat", async () => {
      const { fixture, owner, hseManager, category } = await setupTenant();

      const document = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({
          title: "SOP Kerja Panas",
          documentType: "SOP",
          documentCategoryId: category.id,
          ownerUserId: owner.id,
          reviewCycleMonths: 12,
        }),
      );

      const version = await createDraftVersion(fixture.tenantId, fixture.userId, document.id);
      expect(version.majorVersion).toBe(1);
      expect(version.minorVersion).toBe(0);

      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        versionService.submitForApproval(version.id),
      );
      expect(submitted.status).toBe("PENDING_APPROVAL");
      expect(submitted.workflowInstanceId).not.toBeNull();

      const documentAfterSubmit = await adminPrisma.document.findUniqueOrThrow({ where: { id: document.id } });
      expect(documentAfterSubmit.status).toBe("IN_REVIEW");

      // Stage 1 — Document Owner (CONTEXT_USER) approve.
      const stage1Task = await adminPrisma.workflowTask.findFirstOrThrow({
        where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" },
      });
      expect(stage1Task.assignedTo).toBe(owner.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: owner.id }, () =>
        workflowEngineService.actOnTask(stage1Task.id, "APPROVE", undefined, owner.id),
      );

      // Stage 2 — HSE Manager (ROLE_IN_SCOPE) approve.
      const stage2Task = await adminPrisma.workflowTask.findFirstOrThrow({
        where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" },
      });
      expect(stage2Task.assignedTo).toBe(hseManager.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        workflowEngineService.actOnTask(stage2Task.id, "APPROVE", undefined, hseManager.id),
      );

      // DocumentWorkflowCompletionListener bereaksi ke WORKFLOW_INSTANCE_COMPLETED_EVENT
      // secara ASYNC (fire-and-forget) — tunggu sebentar sebelum assert.
      await new Promise((r) => setTimeout(r, 300));

      const publishedVersion = await adminPrisma.documentVersion.findUniqueOrThrow({ where: { id: version.id } });
      expect(publishedVersion.status).toBe("PUBLISHED");
      expect(publishedVersion.publishedAt).not.toBeNull();

      const publishedDocument = await adminPrisma.document.findUniqueOrThrow({ where: { id: document.id } });
      expect(publishedDocument.status).toBe("PUBLISHED");
      expect(publishedDocument.currentVersionId).toBe(version.id);
      expect(publishedDocument.nextReviewDate).not.toBeNull();

      const reviewSchedules = await adminPrisma.documentReviewSchedule.findMany({ where: { documentId: document.id } });
      expect(reviewSchedules).toHaveLength(1);
      expect(reviewSchedules[0].status).toBe("SCHEDULED");
    }, 15000);

    it("BR-03: versi kedua PUBLISHED mensupersede versi pertama, document tidak pernah punya 2 versi PUBLISHED aktif", async () => {
      const { fixture, owner, hseManager, category } = await setupTenant();
      const document = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({ title: "SOP Revisi", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id }),
      );

      async function submitAndApproveFull(): Promise<string> {
        const version = await createDraftVersion(fixture.tenantId, fixture.userId, document.id);
        const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          versionService.submitForApproval(version.id),
        );
        const stage1 = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" } });
        await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: owner.id }, () =>
          workflowEngineService.actOnTask(stage1.id, "APPROVE", undefined, owner.id),
        );
        const stage2 = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" } });
        await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
          workflowEngineService.actOnTask(stage2.id, "APPROVE", undefined, hseManager.id),
        );
        await new Promise((r) => setTimeout(r, 300));
        return version.id;
      }

      const firstVersionId = await submitAndApproveFull();
      const secondVersionId = await submitAndApproveFull();

      const first = await adminPrisma.documentVersion.findUniqueOrThrow({ where: { id: firstVersionId } });
      const second = await adminPrisma.documentVersion.findUniqueOrThrow({ where: { id: secondVersionId } });
      expect(first.status).toBe("SUPERSEDED");
      expect(first.supersededByVersionId).toBe(secondVersionId);
      expect(second.status).toBe("PUBLISHED");

      const publishedCount = await adminPrisma.documentVersion.count({ where: { documentId: document.id, status: "PUBLISHED" } });
      expect(publishedCount).toBe(1);

      const doc = await adminPrisma.document.findUniqueOrThrow({ where: { id: document.id } });
      expect(doc.currentVersionId).toBe(secondVersionId);
    }, 20000);

    it("path REJECT: Stage 1 reject -> version REJECTED, document kembali DRAFT (belum pernah PUBLISHED)", async () => {
      const { fixture, owner, category } = await setupTenant();
      const document = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({ title: "SOP Ditolak", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id }),
      );
      const version = await createDraftVersion(fixture.tenantId, fixture.userId, document.id);
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        versionService.submitForApproval(version.id),
      );

      const stage1Task = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" } });
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: owner.id }, () =>
        workflowEngineService.actOnTask(stage1Task.id, "REJECT", "Belum lengkap", owner.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const rejectedVersion = await adminPrisma.documentVersion.findUniqueOrThrow({ where: { id: version.id } });
      expect(rejectedVersion.status).toBe("REJECTED");

      const documentAfterReject = await adminPrisma.document.findUniqueOrThrow({ where: { id: document.id } });
      expect(documentAfterReject.status).toBe("DRAFT");
      expect(documentAfterReject.currentVersionId).toBeNull();
    }, 15000);

    it("submitForApproval menolak versi dgn attachment INFECTED", async () => {
      const { fixture, owner, category } = await setupTenant();
      const document = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({ title: "SOP Terinfeksi", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id }),
      );
      const { randomUUID } = await import("node:crypto");
      const documentVersionId = randomUUID();
      const attachmentId = await uploadAndConfirmDocumentFile(app, fixture.tenantId, fixture.userId, documentVersionId, "INFECTED");
      const version = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        versionService.createVersion({ documentId: document.id, attachmentId }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => versionService.submitForApproval(version.id)),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("DocumentDistributionService — BR-05/BR-07 + ekspansi target", () => {
    async function publishedDocumentFixture() {
      const { fixture, owner, hseManager, category } = await setupTenant();
      const document = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({ title: "SOP Distribusi", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id, classification: "RESTRICTED" }),
      );
      const version = await createDraftVersion(fixture.tenantId, fixture.userId, document.id);
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        versionService.submitForApproval(version.id),
      );
      const stage1 = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" } });
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: owner.id }, () =>
        workflowEngineService.actOnTask(stage1.id, "APPROVE", undefined, owner.id),
      );
      const stage2 = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" } });
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        workflowEngineService.actOnTask(stage2.id, "APPROVE", undefined, hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));
      return { fixture, owner, hseManager, category, document, version };
    }

    it("BR-07: dokumen RESTRICTED ditolak utk target ALL_TENANT", async () => {
      const { fixture, document, version } = await publishedDocumentFixture();
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          distributionService.createDistribution({ documentId: document.id, documentVersionId: version.id, distributionTargetType: "ALL_TENANT" }),
        ),
      ).rejects.toThrow();
    });

    it("target USER — ekspansi menghasilkan tepat 1 read_acknowledgement_logs PENDING", async () => {
      const { fixture, document, version } = await publishedDocumentFixture();
      const reader = await seedUserInTenant(fixture.tenantId, "Pembaca");

      const distribution = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        distributionService.createDistribution({
          documentId: document.id,
          documentVersionId: version.id,
          distributionTargetType: "USER",
          distributionTargetId: reader.id,
          acknowledgementDueDays: 7,
        }),
      );

      const logs = await adminPrisma.readAcknowledgementLog.findMany({ where: { documentDistributionId: distribution.id } });
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe(reader.id);
      expect(logs[0].status).toBe("PENDING");
    });

    it("BR-05: dokumen RETIRED menolak distribusi baru", async () => {
      const { fixture, document, version } = await publishedDocumentFixture();
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => documentService.retire(document.id, "Sudah usang"));

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          distributionService.createDistribution({ documentId: document.id, documentVersionId: version.id, distributionTargetType: "USER", distributionTargetId: fixture.userId }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("ReadAcknowledgementService — BR-04", () => {
    async function ackFixture() {
      const { fixture, owner, hseManager, category } = await setupTenant();
      const document = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({ title: "SOP Ack", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id }),
      );
      const version = await createDraftVersion(fixture.tenantId, fixture.userId, document.id);
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        versionService.submitForApproval(version.id),
      );
      const stage1 = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" } });
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: owner.id }, () => workflowEngineService.actOnTask(stage1.id, "APPROVE", undefined, owner.id));
      const stage2 = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" } });
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () => workflowEngineService.actOnTask(stage2.id, "APPROVE", undefined, hseManager.id));
      await new Promise((r) => setTimeout(r, 300));

      const reader = await seedUserInTenant(fixture.tenantId, "Pembaca Ack");
      const distribution = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        distributionService.createDistribution({ documentId: document.id, documentVersionId: version.id, distributionTargetType: "USER", distributionTargetId: reader.id, acknowledgementDueDays: 7 }),
      );
      const log = await adminPrisma.readAcknowledgementLog.findFirstOrThrow({ where: { documentDistributionId: distribution.id } });
      return { fixture, reader, log };
    }

    it("view lalu acknowledge (IN_APP_CLICK) — transisi PENDING->VIEWED->ACKNOWLEDGED", async () => {
      const { fixture, reader, log } = await ackFixture();
      const viewed = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: reader.id }, () => ackService.markViewed(log.id));
      expect(viewed.status).toBe("VIEWED");
      const acked = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: reader.id }, () => ackService.acknowledge(log.id, "IN_APP_CLICK"));
      expect(acked.status).toBe("ACKNOWLEDGED");
      expect(acked.acknowledgementMethod).toBe("IN_APP_CLICK");
    });

    it("BR-04: acknowledge langsung dari PENDING (skip VIEWED) via IN_APP_CLICK ditolak", async () => {
      const { fixture, reader, log } = await ackFixture();
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: reader.id }, () => ackService.acknowledge(log.id, "IN_APP_CLICK")),
      ).rejects.toThrow();
    });

    it("acknowledge langsung dari PENDING via E_SIGNATURE diizinkan (BR-04 pengecualian eksplisit)", async () => {
      const { fixture, reader, log } = await ackFixture();
      const acked = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: reader.id }, () => ackService.acknowledge(log.id, "E_SIGNATURE"));
      expect(acked.status).toBe("ACKNOWLEDGED");
    });

    it("user LAIN tidak bisa markViewed/acknowledge ack log yang bukan miliknya (NotFoundException, tidak leak keberadaan)", async () => {
      const { fixture, log } = await ackFixture();
      const stranger = await seedUserInTenant(fixture.tenantId, "Orang Asing");
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: stranger.id }, () => ackService.markViewed(log.id)),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("Scan jobs — BR-04 acknowledgement overdue & BR-06 review overdue", () => {
    it("read-acknowledgement-scan: PENDING lewat acknowledgement_due_days -> OVERDUE", async () => {
      const { fixture, owner, hseManager, category } = await setupTenant();
      const document = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({ title: "SOP Overdue Ack", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id }),
      );
      const version = await createDraftVersion(fixture.tenantId, fixture.userId, document.id);
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => versionService.submitForApproval(version.id));
      const stage1 = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" } });
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: owner.id }, () => workflowEngineService.actOnTask(stage1.id, "APPROVE", undefined, owner.id));
      const stage2 = await adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId: submitted.workflowInstanceId!, status: "PENDING" } });
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () => workflowEngineService.actOnTask(stage2.id, "APPROVE", undefined, hseManager.id));
      await new Promise((r) => setTimeout(r, 300));

      const reader = await seedUserInTenant(fixture.tenantId, "Pembaca Telat");
      const distribution = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        distributionService.createDistribution({ documentId: document.id, documentVersionId: version.id, distributionTargetType: "USER", distributionTargetId: reader.id, acknowledgementDueDays: 1 }),
      );
      // Mundurkan distributedAt supaya SUDAH lewat due date (1 hari) — simulasi waktu berlalu.
      await adminPrisma.documentDistribution.update({ where: { id: distribution.id }, data: { distributedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } });

      await documentReviewScanService.scan();
      await readAcknowledgementScanService.scan();

      const log = await adminPrisma.readAcknowledgementLog.findFirstOrThrow({ where: { documentDistributionId: distribution.id } });
      expect(log.status).toBe("OVERDUE");
    }, 15000);

    it("document-review-scan: BR-06 scheduled_review_date lewat -> OVERDUE; H-30 -> reviewReminderSentAt terisi", async () => {
      const { fixture, owner, category } = await setupTenant();
      const document = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({ title: "SOP Review Overdue", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id }),
      );

      const overdueSchedule = await adminPrisma.documentReviewSchedule.create({
        data: { tenantId: fixture.tenantId, documentId: document.id, scheduledReviewDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), status: "SCHEDULED", createdBy: owner.id, updatedBy: owner.id },
      });
      const dueSoonSchedule = await adminPrisma.documentReviewSchedule.create({
        data: { tenantId: fixture.tenantId, documentId: document.id, scheduledReviewDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), status: "SCHEDULED", createdBy: owner.id, updatedBy: owner.id },
      });

      await documentReviewScanService.scan();

      const overdueAfter = await adminPrisma.documentReviewSchedule.findUniqueOrThrow({ where: { id: overdueSchedule.id } });
      expect(overdueAfter.status).toBe("OVERDUE");
      expect(overdueAfter.reviewReminderSentAt).not.toBeNull();

      const dueSoonAfter = await adminPrisma.documentReviewSchedule.findUniqueOrThrow({ where: { id: dueSoonSchedule.id } });
      expect(dueSoonAfter.status).toBe("SCHEDULED");
      expect(dueSoonAfter.reviewReminderSentAt).not.toBeNull();
    });
  });

  describe("DocumentReviewScheduleService.recordOutcome", () => {
    it("NO_CHANGE_NEEDED: selesai + jadwal berikutnya otomatis dibuat", async () => {
      const { fixture, owner, category } = await setupTenant();
      const document = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({ title: "SOP Recur", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id, reviewCycleMonths: 6 }),
      );
      const schedule = await adminPrisma.documentReviewSchedule.create({
        data: { tenantId: fixture.tenantId, documentId: document.id, scheduledReviewDate: new Date(), status: "SCHEDULED", createdBy: owner.id, updatedBy: owner.id },
      });

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: owner.id }, () =>
        reviewScheduleService.recordOutcome({ reviewScheduleId: schedule.id, reviewOutcome: "NO_CHANGE_NEEDED" }),
      );

      const allSchedules = await adminPrisma.documentReviewSchedule.findMany({ where: { documentId: document.id } });
      expect(allSchedules).toHaveLength(2);
      expect(allSchedules.find((s) => s.id === schedule.id)?.status).toBe("COMPLETED");
      expect(allSchedules.find((s) => s.id !== schedule.id)?.status).toBe("SCHEDULED");
    });

    it("RETIRE_DOCUMENT: memicu DocumentService.retire()", async () => {
      const { fixture, owner, category } = await setupTenant();
      const document = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        documentService.createDocument({ title: "SOP Retire via Review", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id }),
      );
      const schedule = await adminPrisma.documentReviewSchedule.create({
        data: { tenantId: fixture.tenantId, documentId: document.id, scheduledReviewDate: new Date(), status: "SCHEDULED", createdBy: owner.id, updatedBy: owner.id },
      });

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: owner.id }, () =>
        reviewScheduleService.recordOutcome({ reviewScheduleId: schedule.id, reviewOutcome: "RETIRE_DOCUMENT", retireReason: "Digantikan regulasi baru" }),
      );

      const retiredDocument = await adminPrisma.document.findUniqueOrThrow({ where: { id: document.id } });
      expect(retiredDocument.status).toBe("RETIRED");
    });
  });

  describe("Isolasi tenant (RLS)", () => {
    it("dokumen tenant A tidak terlihat dari context tenant B", async () => {
      const { fixture: tenantA, owner, category } = await setupTenant();
      const tenantB = await seedTenantFixture();

      const document = await tenantContextStorage.run({ tenantId: tenantA.tenantId, userId: tenantA.userId }, () =>
        documentService.createDocument({ title: "SOP Rahasia Tenant A", documentType: "SOP", documentCategoryId: category.id, ownerUserId: owner.id }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => documentService.getById(document.id)),
      ).rejects.toThrow();
    });
  });
});
