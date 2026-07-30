import { INestApplication } from "@nestjs/common";
import { seedContractorNotificationTemplates } from "../../prisma/seed-contractor-notification-templates";
import { seedIndustryTemplates } from "../../prisma/seed-industry-templates";
import { ContractorDocumentComplianceService } from "../../src/modules/domains/contractor/contractor-document-compliance.service";
import { ContractorDueScanService } from "../../src/modules/domains/contractor/contractor-due-scan.service";
import { ContractorPerformanceEvaluationService } from "../../src/modules/domains/contractor/contractor-performance-evaluation.service";
import { ContractorPrequalificationService } from "../../src/modules/domains/contractor/contractor-prequalification.service";
import { ContractorProjectAssignmentService } from "../../src/modules/domains/contractor/contractor-project-assignment.service";
import { ContractorWorkerService } from "../../src/modules/domains/contractor/contractor-worker.service";
import { ContractorService } from "../../src/modules/domains/contractor/contractor.service";
import { WorkPermitTypeService } from "../../src/modules/domains/work-permit/work-permit-type.service";
import { WorkPermitService } from "../../src/modules/domains/work-permit/work-permit.service";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Task 6.3 (Modul 17 Contractor Management) — cakupan: Contractor create +
 * BR-06 (blacklist gate wajib justifikasi); ContractorPrequalification BR-05
 * (gate dokumen wajib VERIFIED) + siklus review 2-stage (APPROVED+PASS ->
 * contractors.status=PREQUALIFIED); ContractorProjectAssignment BR-01 (gate
 * status kontraktor) + BR-04 (gate IUJP/CSMS utk tenant OIL_GAS);
 * ContractorWorker BR-03 (site induction gate ke ACTIVE); ContractorPerformanceEvaluation
 * siklus review 1-stage + BR-07 (UNACCEPTABLE 2x berturut -> notifikasi);
 * ContractorDocumentCompliance + contractor-due-scan (reminder H-N,
 * transisi EXPIRED, idempotency); BR-02 (Modul 17 -> WorkPermitService,
 * blokir permit saat dokumen kepatuhan EXPIRED); isolasi tenant RLS.
 */
describe("Contractor Management — Modul 17 (task 6.3)", () => {
  let app: INestApplication;
  let contractorService: ContractorService;
  let prequalificationService: ContractorPrequalificationService;
  let complianceService: ContractorDocumentComplianceService;
  let workerService: ContractorWorkerService;
  let assignmentService: ContractorProjectAssignmentService;
  let evaluationService: ContractorPerformanceEvaluationService;
  let scanService: ContractorDueScanService;
  let workPermitService: WorkPermitService;
  let workPermitTypeService: WorkPermitTypeService;
  let workflowEngineService: WorkflowEngineService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    contractorService = app.get(ContractorService);
    prequalificationService = app.get(ContractorPrequalificationService);
    complianceService = app.get(ContractorDocumentComplianceService);
    workerService = app.get(ContractorWorkerService);
    assignmentService = app.get(ContractorProjectAssignmentService);
    evaluationService = app.get(ContractorPerformanceEvaluationService);
    scanService = app.get(ContractorDueScanService);
    workPermitService = app.get(WorkPermitService);
    workPermitTypeService = app.get(WorkPermitTypeService);
    workflowEngineService = app.get(WorkflowEngineService);
    await seedContractorNotificationTemplates(adminPrisma);
    await seedIndustryTemplates(adminPrisma);
  }, 60000);

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function setupTenant() {
    const fixture = await seedTenantFixture();
    const coordinator = await seedUserInTenant(fixture.tenantId, "Contractor Coordinator");
    await assignRole(fixture.tenantId, coordinator.id, "HSE_OFFICER");
    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    const picInternal = await seedUserInTenant(fixture.tenantId, "PIC Internal");
    await assignRole(fixture.tenantId, picInternal.id, "WORKER_EMPLOYEE");
    const { companyId, siteId } = await seedSite(fixture.tenantId, fixture.userId);
    return { fixture, coordinator, hseManager, picInternal, companyId, siteId };
  }

  async function pendingTaskFor(instanceId: string) {
    return adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId, status: "PENDING" } });
  }

  async function approveTask(tenantId: string, workflowInstanceId: string, approverId: string) {
    const task = await pendingTaskFor(workflowInstanceId);
    await tenantContextStorage.run({ tenantId, userId: approverId }, () => workflowEngineService.actOnTask(task.id, "APPROVE", undefined, approverId));
    await sleep(300);
  }

  describe("Contractor — create + BR-06 blacklist gate", () => {
    it("create() status default REGISTERED", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({
          contractorName: "PT Fixture Kontraktor",
          contractorType: "CONSTRUCTION",
          contractorCategory: "TIER_1",
          overallRiskRating: "MEDIUM",
        }),
      );
      expect(contractor.status).toBe("REGISTERED");
    });

    it("BR-06: updateStatus(BLACKLISTED) tanpa justifikasi ditolak", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT Fixture 2", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "LOW" }),
      );
      await expect(tenantContextStorage.run(actorCtx, () => contractorService.updateStatus(contractor.id, "BLACKLISTED"))).rejects.toThrow();
    });

    it("BR-06: updateStatus(BLACKLISTED) DENGAN justifikasi berhasil + tercatat system_audit_logs", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT Fixture 3", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "LOW" }),
      );
      const updated = await tenantContextStorage.run(actorCtx, () =>
        contractorService.updateStatus(contractor.id, "BLACKLISTED", "Pelanggaran K3 berulang"),
      );
      expect(updated.status).toBe("BLACKLISTED");
      const auditRow = await adminPrisma.systemAuditLog.findFirst({ where: { entityType: "contractor", entityId: contractor.id, action: "BLACKLIST" } });
      expect(auditRow).not.toBeNull();
    });
  });

  describe("ContractorPrequalification — BR-05 gate + siklus review 2-stage", () => {
    it("BR-05: submitForReview(PASS) ditolak jika dokumen wajib belum VERIFIED", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT PQ Fixture", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "MEDIUM" }),
      );
      const pq = await tenantContextStorage.run(actorCtx, () =>
        prequalificationService.create({ contractorId: contractor.id, prequalificationType: "NEW" }),
      );
      await tenantContextStorage.run(actorCtx, () => prequalificationService.addDocument(pq.id, { documentType: "SIUJK", isMandatory: true }));

      await expect(
        tenantContextStorage.run(actorCtx, () => prequalificationService.submitForReview(pq.id, { result: "PASS" })),
      ).rejects.toThrow();
    });

    it("siklus penuh: dokumen VERIFIED -> submit PASS -> APPROVE 2-stage -> contractors.status=PREQUALIFIED", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT PQ Full", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "MEDIUM" }),
      );
      const pq = await tenantContextStorage.run(actorCtx, () =>
        prequalificationService.create({ contractorId: contractor.id, prequalificationType: "NEW" }),
      );
      const doc = await tenantContextStorage.run(actorCtx, () => prequalificationService.addDocument(pq.id, { documentType: "SIUJK", isMandatory: true }));
      await tenantContextStorage.run(actorCtx, () => prequalificationService.verifyDocument(doc.id, "VERIFIED"));

      const submitted = await tenantContextStorage.run(actorCtx, () => prequalificationService.submitForReview(pq.id, { result: "PASS", overallScore: 90 }));
      expect(submitted.status).toBe("UNDER_REVIEW");
      expect(submitted.workflowInstanceId).not.toBeNull();

      await approveTask(t.fixture.tenantId, submitted.workflowInstanceId!, t.coordinator.id);
      const afterStage1 = await tenantContextStorage.run(actorCtx, () => prequalificationService.getById(pq.id));
      await approveTask(t.fixture.tenantId, afterStage1.workflowInstanceId!, t.hseManager.id);
      await sleep(500);

      const final = await tenantContextStorage.run(actorCtx, () => prequalificationService.getById(pq.id));
      expect(final.status).toBe("APPROVED");
      expect(final.validFrom).not.toBeNull();
      expect(final.validUntil).not.toBeNull();

      const updatedContractor = await tenantContextStorage.run(actorCtx, () => contractorService.getById(contractor.id));
      expect(updatedContractor.status).toBe("PREQUALIFIED");
    }, 20000);
  });

  describe("ContractorProjectAssignment — BR-01 gate", () => {
    it("BR-01: create() ditolak jika contractors.status=REGISTERED", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT Belum PQ", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "LOW" }),
      );
      await expect(
        tenantContextStorage.run(actorCtx, () =>
          assignmentService.create({
            contractorId: contractor.id,
            siteId: t.siteId,
            contractStartDate: new Date(),
            picInternalUserId: t.picInternal.id,
            riskClassification: "LOW",
          }),
        ),
      ).rejects.toThrow();
    });

    it("create() berhasil jika contractors.status=PREQUALIFIED (via updateStatus manual)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT Sudah PQ", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "LOW" }),
      );
      await tenantContextStorage.run(actorCtx, () => contractorService.updateStatus(contractor.id, "PREQUALIFIED"));

      const assignment = await tenantContextStorage.run(actorCtx, () =>
        assignmentService.create({
          contractorId: contractor.id,
          siteId: t.siteId,
          contractStartDate: new Date(),
          picInternalUserId: t.picInternal.id,
          riskClassification: "LOW",
        }),
      );
      expect(assignment.status).toBe("PLANNED");
      expect(assignment.companyId).toBe(t.companyId);
    });

    it("BR-04: activate() ditolak utk tenant OIL_GAS tanpa IUJP+CSMS_CERTIFICATE", async () => {
      const t = await setupTenant();
      const oilGasTemplate = await adminPrisma.industryTemplate.findFirstOrThrow({ where: { code: "OIL_GAS" } });
      await adminPrisma.tenant.update({ where: { id: t.fixture.tenantId }, data: { industryTemplateId: oilGasTemplate.id } });

      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT Migas", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "HIGH" }),
      );
      await tenantContextStorage.run(actorCtx, () => contractorService.updateStatus(contractor.id, "PREQUALIFIED"));
      const assignment = await tenantContextStorage.run(actorCtx, () =>
        assignmentService.create({
          contractorId: contractor.id,
          siteId: t.siteId,
          contractStartDate: new Date(),
          picInternalUserId: t.picInternal.id,
          riskClassification: "HIGH",
        }),
      );

      await expect(tenantContextStorage.run(actorCtx, () => assignmentService.activate(assignment.id))).rejects.toThrow();

      await tenantContextStorage.run(actorCtx, () =>
        complianceService.register({ contractorId: contractor.id, documentCategory: "IUJP", expiryDate: new Date("2030-01-01"), isMandatoryForPtk007: true }),
      );
      await tenantContextStorage.run(actorCtx, () =>
        complianceService.register({
          contractorId: contractor.id,
          documentCategory: "CSMS_CERTIFICATE",
          expiryDate: new Date("2030-01-01"),
          isMandatoryForPtk007: true,
        }),
      );
      const activated = await tenantContextStorage.run(actorCtx, () => assignmentService.activate(assignment.id));
      expect(activated.status).toBe("ACTIVE");
    });
  });

  describe("ContractorWorker — BR-03 site induction gate", () => {
    it("register() SELALU status SUSPENDED (placeholder pra-induksi), completeSiteInduction() -> ACTIVE", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT Worker Fixture", contractorType: "LABOR_SUPPLY", contractorCategory: "TIER_1", overallRiskRating: "LOW" }),
      );
      const worker = await tenantContextStorage.run(actorCtx, () =>
        workerService.register({ contractorId: contractor.id, fullName: "Budi Fixture", workerCategory: "SKILLED" }),
      );
      expect(worker.status).toBe("SUSPENDED");
      expect(worker.siteInductionCompleted).toBe(false);

      const inducted = await tenantContextStorage.run(actorCtx, () => workerService.completeSiteInduction(worker.id));
      expect(inducted.status).toBe("ACTIVE");
      expect(inducted.siteInductionCompleted).toBe(true);
      expect(inducted.mobilizationDate).not.toBeNull();
    });
  });

  describe("ContractorPerformanceEvaluation — siklus review 1-stage + BR-07", () => {
    it("BR-07: overall_rating UNACCEPTABLE 2x berturut memicu notifikasi HSE Manager", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT Eval Fixture", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "HIGH" }),
      );

      async function createApproveEvaluation(rating: "UNACCEPTABLE" | "GOOD") {
        const evalRecord = await tenantContextStorage.run(actorCtx, () =>
          evaluationService.create({
            contractorId: contractor.id,
            evaluationPeriod: "QUARTERLY",
            periodStartDate: new Date("2026-01-01"),
            periodEndDate: new Date("2026-03-31"),
            overallRating: rating,
          }),
        );
        const submitted = await tenantContextStorage.run(actorCtx, () => evaluationService.submitForReview(evalRecord.id));
        await approveTask(t.fixture.tenantId, submitted.workflowInstanceId!, t.hseManager.id);
        await sleep(400);
        return tenantContextStorage.run(actorCtx, () => evaluationService.getById(evalRecord.id));
      }

      const first = await createApproveEvaluation("UNACCEPTABLE");
      expect(first.status).toBe("APPROVED");
      const second = await createApproveEvaluation("UNACCEPTABLE");
      expect(second.status).toBe("APPROVED");

      const notif = await adminPrisma.notification.findFirst({
        where: { eventType: "CONTRACTOR_EVALUATION_UNACCEPTABLE_CONSECUTIVE", entityId: second.id, recipientUserId: t.hseManager.id },
      });
      expect(notif).not.toBeNull();
    }, 20000);
  });

  describe("ContractorDocumentCompliance + contractor-due-scan", () => {
    it("register() dgn expiryDate lewat langsung berstatus EXPIRED", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT Doc Fixture", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "LOW" }),
      );
      const doc = await tenantContextStorage.run(actorCtx, () =>
        complianceService.register({ contractorId: contractor.id, documentCategory: "BPJS_KETENAGAKERJAAN", expiryDate: new Date("2020-01-01") }),
      );
      expect(doc.status).toBe("EXPIRED");
    });

    it("scan(): dokumen VALID dalam jendela reminder -> EXPIRING_SOON + idempotency (scan kedua tidak dobel)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT Scan Fixture", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "LOW" }),
      );
      const soonExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const doc = await tenantContextStorage.run(actorCtx, () =>
        complianceService.register({ contractorId: contractor.id, documentCategory: "INSURANCE_GENERAL_LIABILITY", expiryDate: soonExpiry, reminderDaysBefore: 30 }),
      );
      expect(doc.status).toBe("VALID");

      await scanService.scan();
      const afterScan = await tenantContextStorage.run(actorCtx, () => complianceService.getById(doc.id));
      expect(afterScan.status).toBe("EXPIRING_SOON");
      expect(afterScan.reminderSentAt).not.toBeNull();

      const firstReminderSentAt = afterScan.reminderSentAt;
      await scanService.scan();
      const afterSecondScan = await tenantContextStorage.run(actorCtx, () => complianceService.getById(doc.id));
      expect(afterSecondScan.reminderSentAt?.getTime()).toBe(firstReminderSentAt?.getTime());
    }, 20000);

    it("BR-02: WorkPermitService.create() ditolak jika contractorCompanyId py dokumen EXPIRED", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const contractor = await tenantContextStorage.run(actorCtx, () =>
        contractorService.create({ contractorName: "PT BR02 Fixture", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "MEDIUM" }),
      );
      await tenantContextStorage.run(actorCtx, () =>
        complianceService.register({ contractorId: contractor.id, documentCategory: "BPJS_KESEHATAN", expiryDate: new Date("2020-01-01") }),
      );

      const permitType = await tenantContextStorage.run(actorCtx, () =>
        workPermitTypeService.create({ code: `HW-${Date.now()}`, name: "Hot Work Fixture", defaultRiskLevel: "MEDIUM" }),
      );
      const requester = await seedUserInTenant(t.fixture.tenantId, "Requester Fixture");

      await expect(
        tenantContextStorage.run(actorCtx, () =>
          workPermitService.create({
            workPermitTypeId: permitType.id,
            siteId: t.siteId,
            title: "Pekerjaan Fixture",
            description: "Deskripsi fixture",
            requesterId: requester.id,
            contractorCompanyId: contractor.id,
            plannedStartDatetime: new Date(),
            plannedEndDatetime: new Date(Date.now() + 3600_000),
          }),
        ),
      ).rejects.toThrow(/BR-02/);
    });
  });

  describe("Isolasi tenant (RLS)", () => {
    it("contractorService.getById() tenant lain -> not found", async () => {
      const tenantA = await setupTenant();
      const tenantB = await setupTenant();
      const actorA = { tenantId: tenantA.fixture.tenantId, userId: tenantA.coordinator.id };
      const actorB = { tenantId: tenantB.fixture.tenantId, userId: tenantB.coordinator.id };

      const contractor = await tenantContextStorage.run(actorA, () =>
        contractorService.create({ contractorName: "PT RLS Fixture", contractorType: "CONSTRUCTION", contractorCategory: "TIER_1", overallRiskRating: "LOW" }),
      );

      await expect(tenantContextStorage.run(actorB, () => contractorService.getById(contractor.id))).rejects.toThrow();
    });
  });
});
