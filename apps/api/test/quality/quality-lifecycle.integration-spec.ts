import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { seedQualityNotificationTemplates } from "../../prisma/seed-quality-notification-templates";
import { CapaRegisterService } from "../../src/modules/domains/capa/capa-register.service";
import { CustomerComplaintService } from "../../src/modules/domains/quality/customer-complaint.service";
import { NcrRecordService } from "../../src/modules/domains/quality/ncr-record.service";
import { QualityComplaintResponseSlaScanService } from "../../src/modules/domains/quality/quality-complaint-response-sla-scan.service";
import { QualityInspectionService } from "../../src/modules/domains/quality/quality-inspection.service";
import { QualityObjectiveService } from "../../src/modules/domains/quality/quality-objective.service";
import { SupplierQualityRecordService } from "../../src/modules/domains/quality/supplier-quality-record.service";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Task 5.1 (Modul 11 Quality Management) — cakupan: NCR siklus penuh
 * (containment->disposisi 3-stage workflow->CAPA link->re-inspeksi->closure,
 * BR-01/06/07), Customer Complaint siklus penuh (investigasi->3-stage
 * workflow->CAPA_IN_PROGRESS utk HIGH/CRITICAL->konfirmasi kepuasan, BR-02
 * scan job), Quality Inspection (BR-03 auto-NCR dari FAIL, BR-08 deviation
 * workflow 1-stage), Supplier Quality Evaluation (1-stage workflow, BR-04-analog),
 * Quality Objective (BR-05 status auto-calc), isolasi tenant RLS.
 */
describe("Quality Management — Modul 11 (task 5.1)", () => {
  let app: INestApplication;
  let ncrRecordService: NcrRecordService;
  let customerComplaintService: CustomerComplaintService;
  let qualityInspectionService: QualityInspectionService;
  let supplierQualityRecordService: SupplierQualityRecordService;
  let qualityObjectiveService: QualityObjectiveService;
  let complaintResponseSlaScanService: QualityComplaintResponseSlaScanService;
  let capaRegisterService: CapaRegisterService;
  let workflowEngineService: WorkflowEngineService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    ncrRecordService = app.get(NcrRecordService);
    customerComplaintService = app.get(CustomerComplaintService);
    qualityInspectionService = app.get(QualityInspectionService);
    supplierQualityRecordService = app.get(SupplierQualityRecordService);
    qualityObjectiveService = app.get(QualityObjectiveService);
    complaintResponseSlaScanService = app.get(QualityComplaintResponseSlaScanService);
    capaRegisterService = app.get(CapaRegisterService);
    workflowEngineService = app.get(WorkflowEngineService);
    await seedQualityNotificationTemplates(adminPrisma);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function setupTenant() {
    const fixture = await seedTenantFixture();
    const qualityManager = await seedUserInTenant(fixture.tenantId, "Quality Manager");
    await assignRole(fixture.tenantId, qualityManager.id, "QUALITY_MANAGER");
    const qcInspector = await seedUserInTenant(fixture.tenantId, "QC Inspector");
    await assignRole(fixture.tenantId, qcInspector.id, "QC_INSPECTOR");
    const supervisor = await seedUserInTenant(fixture.tenantId, "Supervisor");
    await assignRole(fixture.tenantId, supervisor.id, "SUPERVISOR");
    const { companyId, siteId } = await seedSite(fixture.tenantId, fixture.userId);
    return { fixture, qualityManager, qcInspector, supervisor, companyId, siteId };
  }

  async function pendingTaskFor(instanceId: string) {
    return adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId, status: "PENDING" } });
  }

  async function approveAllStages(tenantId: string, workflowInstanceId: string, approverIds: string[]) {
    for (const approverId of approverIds) {
      const task = await pendingTaskFor(workflowInstanceId);
      await tenantContextStorage.run({ tenantId, userId: approverId }, () => workflowEngineService.actOnTask(task.id, "APPROVE", undefined, approverId));
    }
    await sleep(300);
  }

  describe("NCR — siklus penuh MAJOR: containment->disposisi 3-stage->CAPA link->re-inspeksi->CLOSED", () => {
    it("OPEN->CONTAINMENT->DISPOSITION_PENDING->DISPOSITIONED->CAPA_LINKED->CLOSED", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.qcInspector.id };

      const ncr = await tenantContextStorage.run(actorCtx, () =>
        ncrRecordService.create({
          siteId: t.siteId,
          ncrSource: "INTERNAL",
          title: "Dimensi produk di luar toleransi",
          description: "Diameter luar melebihi spesifikasi",
          detectedDate: new Date(),
          detectionStage: "IN_PROCESS",
          severity: "MAJOR",
          quantityNonconforming: 50,
          unitOfMeasure: "pcs",
        }),
      );
      expect(ncr.status).toBe("OPEN");
      expect(ncr.ncrNumber).toContain("NCR");

      await tenantContextStorage.run(actorCtx, () => ncrRecordService.recordContainment(ncr.id, "Produk ditahan di area quarantine"));
      const proposed = await tenantContextStorage.run(actorCtx, () =>
        ncrRecordService.proposeDisposition(ncr.id, { disposition: "REWORK", dispositionJustification: "Rework toleransi ulang" }),
      );
      expect(proposed.status).toBe("DISPOSITION_PENDING");
      expect(proposed.reInspectionRequired).toBe(true);

      await approveAllStages(t.fixture.tenantId, proposed.workflowInstanceId!, [t.supervisor.id, t.qualityManager.id, t.qualityManager.id]);

      const dispositioned = await adminPrisma.ncrRecord.findUniqueOrThrow({ where: { id: ncr.id } });
      expect(dispositioned.status).toBe("DISPOSITIONED");
      expect(dispositioned.dispositionApprovedAt).not.toBeNull();

      const capa = await tenantContextStorage.run(actorCtx, () =>
        capaRegisterService.create({
          sourceType: "QUALITY_NCR",
          sourceId: ncr.id,
          category: "CORRECTIVE",
          priority: "HIGH",
          title: `Tindak lanjut ${ncr.ncrNumber}`,
          problemStatement: "Dimensi produk di luar toleransi",
          siteId: t.siteId,
        }),
      );
      const linked = await tenantContextStorage.run(actorCtx, () => ncrRecordService.linkCapaRegister(ncr.id, capa.id));
      expect(linked.status).toBe("CAPA_LINKED");

      await expect(tenantContextStorage.run(actorCtx, () => ncrRecordService.close(ncr.id))).rejects.toThrow(/BR-07/);

      await tenantContextStorage.run(actorCtx, () => ncrRecordService.recordReInspectionResult(ncr.id, "PASS"));
      const closed = await tenantContextStorage.run(actorCtx, () => ncrRecordService.close(ncr.id));
      expect(closed.status).toBe("CLOSED");
    }, 30000);
  });

  describe("NCR — BR-01 gate + notifikasi CRITICAL", () => {
    it("severity CRITICAL memicu notifikasi QUALITY_NCR_CRITICAL; close() ditolak tanpa capa_id", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.qcInspector.id };

      const ncr = await tenantContextStorage.run(actorCtx, () =>
        ncrRecordService.create({
          siteId: t.siteId,
          ncrSource: "INTERNAL",
          title: "Kontaminasi lini produksi",
          description: "Ditemukan kontaminasi serius",
          detectedDate: new Date(),
          detectionStage: "IN_PROCESS",
          severity: "CRITICAL",
          quantityNonconforming: 200,
          unitOfMeasure: "pcs",
        }),
      );

      const notifs = await adminPrisma.notification.findMany({ where: { entityId: ncr.id, eventType: "QUALITY_NCR_CRITICAL" } });
      expect(notifs.map((n) => n.recipientUserId)).toContain(t.qualityManager.id);

      await tenantContextStorage.run(actorCtx, () => ncrRecordService.recordContainment(ncr.id, "Line dihentikan"));
      const proposed = await tenantContextStorage.run(actorCtx, () =>
        ncrRecordService.proposeDisposition(ncr.id, { disposition: "SCRAP" }),
      );
      await approveAllStages(t.fixture.tenantId, proposed.workflowInstanceId!, [t.supervisor.id, t.qualityManager.id, t.qualityManager.id]);

      await expect(tenantContextStorage.run(actorCtx, () => ncrRecordService.close(ncr.id))).rejects.toThrow(/BR-01/);
    }, 30000);
  });

  describe("Customer Complaint — siklus penuh severity CRITICAL", () => {
    it("RECEIVED->UNDER_INVESTIGATION->workflow 3-stage->CAPA_IN_PROGRESS->link CAPA->CLOSED", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.qcInspector.id };

      const complaint = await tenantContextStorage.run(actorCtx, () =>
        customerComplaintService.create({
          companyId: t.companyId,
          siteId: t.siteId,
          customerName: "PT Pelanggan Utama",
          complaintChannel: "EMAIL",
          complaintDate: new Date(),
          description: "Produk rusak saat diterima",
          complaintCategory: "PRODUCT_QUALITY",
          severity: "CRITICAL",
        }),
      );
      expect(complaint.status).toBe("RECEIVED");
      expect(complaint.complaintNumber).toContain("CC");

      await tenantContextStorage.run(actorCtx, () => customerComplaintService.startInvestigation(complaint.id, "Investigasi awal dimulai"));
      const submitted = await tenantContextStorage.run(actorCtx, () => customerComplaintService.submitForApproval(complaint.id));
      await approveAllStages(t.fixture.tenantId, submitted.workflowInstanceId!, [t.qcInspector.id, t.qualityManager.id, t.qualityManager.id]);

      const afterApproval = await adminPrisma.customerComplaint.findUniqueOrThrow({ where: { id: complaint.id } });
      expect(afterApproval.status).toBe("CAPA_IN_PROGRESS");

      const capa = await tenantContextStorage.run(actorCtx, () =>
        capaRegisterService.create({
          sourceType: "CUSTOMER_COMPLAINT",
          sourceId: complaint.id,
          category: "CORRECTIVE",
          priority: "HIGH",
          title: `Tindak lanjut ${complaint.complaintNumber}`,
          problemStatement: "Produk rusak saat diterima",
          siteId: t.siteId,
        }),
      );
      const linked = await tenantContextStorage.run(actorCtx, () => customerComplaintService.linkCapaRegister(complaint.id, capa.id));
      expect(linked.status).toBe("RESOLVED");

      const closed = await tenantContextStorage.run(actorCtx, () => customerComplaintService.confirmCustomerSatisfaction(complaint.id, "Root cause X", "Tindakan Y"));
      expect(closed.status).toBe("CLOSED");
      expect(closed.customerSatisfactionConfirmed).toBe(true);
    }, 30000);
  });

  describe("Customer Complaint — BR-02 SLA scan", () => {
    it("initial_response_due_date lewat tanpa respons -> notifikasi + idempotent", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.qcInspector.id };

      const complaint = await tenantContextStorage.run(actorCtx, () =>
        customerComplaintService.create({
          companyId: t.companyId,
          customerName: "PT Pelanggan Lain",
          complaintChannel: "PHONE",
          complaintDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          description: "Keterlambatan pengiriman",
          complaintCategory: "DELIVERY",
          severity: "LOW",
        }),
      );
      await adminPrisma.customerComplaint.update({ where: { id: complaint.id }, data: { initialResponseDueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) } });

      await complaintResponseSlaScanService.scan();

      const after = await adminPrisma.customerComplaint.findUniqueOrThrow({ where: { id: complaint.id } });
      expect(after.responseSlaOverdueNotifiedAt).not.toBeNull();
      const notifs = await adminPrisma.notification.findMany({ where: { entityId: complaint.id, eventType: "QUALITY_COMPLAINT_RESPONSE_SLA_OVERDUE" } });
      expect(notifs.map((n) => n.recipientUserId)).toContain(t.qualityManager.id);

      await complaintResponseSlaScanService.scan();
      const notifsAfterSecondScan = await adminPrisma.notification.findMany({ where: { entityId: complaint.id, eventType: "QUALITY_COMPLAINT_RESPONSE_SLA_OVERDUE" } });
      expect(notifsAfterSecondScan.length).toBe(notifs.length);
    }, 20000);
  });

  describe("Quality Inspection — BR-03 auto-NCR + BR-08 deviation workflow", () => {
    it("FAIL pada FINAL otomatis buat NCR + notifikasi", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.qcInspector.id };

      const inspection = await tenantContextStorage.run(actorCtx, () =>
        qualityInspectionService.create({
          siteId: t.siteId,
          inspectionType: "FINAL",
          quantityInspected: 100,
          inspectionDate: new Date(),
          parameters: [{ parameterName: "Diameter Luar", specificationMin: 10, specificationMax: 12, sequenceNo: 1 }],
        }),
      );
      const [param] = (await tenantContextStorage.run(actorCtx, () => qualityInspectionService.getById(inspection.id))).parameters;
      await tenantContextStorage.run(actorCtx, () => qualityInspectionService.recordParameterResult(param.id, 15, "FAIL"));

      const submitted = await tenantContextStorage.run(actorCtx, () => qualityInspectionService.submit(inspection.id));
      expect(submitted.resultStatus).toBe("FAIL");
      expect(submitted.autoGeneratedNcrId).not.toBeNull();

      const autoNcr = await adminPrisma.ncrRecord.findUniqueOrThrow({ where: { id: submitted.autoGeneratedNcrId! } });
      expect(autoNcr.ncrSource).toBe("INTERNAL");
      expect(autoNcr.detectionStage).toBe("FINAL");

      const notifs = await adminPrisma.notification.findMany({ where: { entityId: inspection.id, eventType: "QUALITY_INSPECTION_FAIL_AUTO_NCR" } });
      expect(notifs.map((n) => n.recipientUserId)).toContain(t.qcInspector.id);
    }, 20000);

    it("overallDisposition=USE_AS_IS_DEVIATION wajib approval sebelum CLOSED (BR-08)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.qcInspector.id };

      const inspection = await tenantContextStorage.run(actorCtx, () =>
        qualityInspectionService.create({
          siteId: t.siteId,
          inspectionType: "IN_PROCESS",
          quantityInspected: 50,
          inspectionDate: new Date(),
          parameters: [{ parameterName: "Ketebalan Coating", sequenceNo: 1 }],
        }),
      );
      const [param] = (await tenantContextStorage.run(actorCtx, () => qualityInspectionService.getById(inspection.id))).parameters;
      await tenantContextStorage.run(actorCtx, () => qualityInspectionService.recordParameterResult(param.id, 5, "PASS"));
      await tenantContextStorage.run(actorCtx, () => qualityInspectionService.submit(inspection.id));

      const reviewed = await tenantContextStorage.run(actorCtx, () => qualityInspectionService.review(inspection.id, "USE_AS_IS_DEVIATION"));
      expect(reviewed.status).toBe("REVIEWED");
      expect(reviewed.deviationWorkflowInstanceId).not.toBeNull();

      await expect(tenantContextStorage.run(actorCtx, () => qualityInspectionService.close(inspection.id))).rejects.toThrow(/BR-08/);

      const task = await pendingTaskFor(reviewed.deviationWorkflowInstanceId!);
      await tenantContextStorage.run({ tenantId: t.fixture.tenantId, userId: t.qualityManager.id }, () =>
        workflowEngineService.actOnTask(task.id, "APPROVE", undefined, t.qualityManager.id),
      );
      await sleep(300);

      const closed = await tenantContextStorage.run(actorCtx, () => qualityInspectionService.close(inspection.id));
      expect(closed.status).toBe("CLOSED");
    }, 30000);
  });

  describe("Supplier Quality Evaluation — 1-stage workflow + BR-04-analog", () => {
    it("submit rating SUSPENDED -> approve -> correctiveActionRequired=true + notifikasi; linkCapaRegister wajib sebelum lengkap", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.qcInspector.id };
      const supplierCode = `SUP-${randomUUID().slice(0, 6)}`;

      const record = await tenantContextStorage.run(actorCtx, () =>
        supplierQualityRecordService.create({
          companyId: t.companyId,
          supplierCode,
          supplierName: "PT Supplier Uji",
          supplierCategory: "RAW_MATERIAL",
          evaluationType: "PERIODIC_EVALUATION",
          evaluationPeriodStart: new Date("2026-01-01"),
          evaluationPeriodEnd: new Date("2026-06-30"),
          overallScore: 45.5,
        }),
      );
      expect(record.status).toBe("DRAFT");

      const submitted = await tenantContextStorage.run(actorCtx, () => supplierQualityRecordService.submitForApproval(record.id, "SUSPENDED"));
      const task = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: t.fixture.tenantId, userId: t.qualityManager.id }, () =>
        workflowEngineService.actOnTask(task.id, "APPROVE", undefined, t.qualityManager.id),
      );
      await sleep(300);

      const approved = await adminPrisma.supplierQualityRecord.findUniqueOrThrow({ where: { id: record.id } });
      expect(approved.status).toBe("APPROVED");
      expect(approved.correctiveActionRequired).toBe(true);

      const notifs = await adminPrisma.notification.findMany({ where: { entityId: record.id, eventType: "QUALITY_SUPPLIER_RATING_DOWNGRADED" } });
      expect(notifs.map((n) => n.recipientUserId)).toContain(t.qualityManager.id);

      await expect(tenantContextStorage.run(actorCtx, () => supplierQualityRecordService.linkCapaRegister(record.id, null as unknown as string))).rejects.toThrow();

      const capa = await tenantContextStorage.run(actorCtx, () =>
        capaRegisterService.create({
          sourceType: "OTHER",
          category: "CORRECTIVE",
          priority: "HIGH",
          title: `Tindak lanjut supplier ${record.supplierName}`,
          problemStatement: "Rating SUSPENDED",
          siteId: t.siteId,
        }),
      );
      const linked = await tenantContextStorage.run(actorCtx, () => supplierQualityRecordService.linkCapaRegister(record.id, capa.id));
      expect(linked.capaRegisterId).toBe(capa.id);
    }, 30000);
  });

  describe("Quality Objective — BR-05 status auto-calc", () => {
    it("progress dalam ambang -> ON_TRACK; progress melampaui ambang -> AT_RISK + notifikasi", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.qualityManager.id };

      const objective = await tenantContextStorage.run(actorCtx, () =>
        qualityObjectiveService.create({
          companyId: t.companyId,
          objectiveCode: `OBJ-${randomUUID().slice(0, 6)}`,
          objectiveTitle: "First Pass Yield >= 95%",
          kpiMetricName: "First Pass Yield",
          targetValue: 95,
          atRiskThresholdPercentage: 10,
          measurementFrequency: "MONTHLY",
          ownerUserId: t.qualityManager.id,
          periodStart: new Date("2026-01-01"),
          periodEnd: new Date("2026-12-31"),
        }),
      );
      expect(objective.status).toBe("ON_TRACK");

      await tenantContextStorage.run(actorCtx, () => qualityObjectiveService.recordProgress(objective.id, "2026-Q1", 93));
      const afterOnTrack = await adminPrisma.qualityObjective.findUniqueOrThrow({ where: { id: objective.id } });
      expect(afterOnTrack.status).toBe("ON_TRACK");

      await tenantContextStorage.run(actorCtx, () => qualityObjectiveService.recordProgress(objective.id, "2026-Q2", 70));
      const afterAtRisk = await adminPrisma.qualityObjective.findUniqueOrThrow({ where: { id: objective.id } });
      expect(afterAtRisk.status).toBe("AT_RISK");

      const notifs = await adminPrisma.notification.findMany({ where: { entityId: objective.id, eventType: "QUALITY_OBJECTIVE_AT_RISK" } });
      expect(notifs.map((n) => n.recipientUserId)).toContain(t.qualityManager.id);

      const reviewed = await tenantContextStorage.run(actorCtx, () => qualityObjectiveService.reviewOutcome(objective.id, "NOT_ACHIEVED"));
      expect(reviewed.status).toBe("NOT_ACHIEVED");

      // Status manual-terminal TIDAK ditimpa progress log berikutnya.
      await tenantContextStorage.run(actorCtx, () => qualityObjectiveService.recordProgress(objective.id, "2026-Q3", 96));
      const afterManualTerminal = await adminPrisma.qualityObjective.findUniqueOrThrow({ where: { id: objective.id } });
      expect(afterManualTerminal.status).toBe("NOT_ACHIEVED");
    }, 20000);
  });

  describe("Isolasi tenant (RLS)", () => {
    it("ncrRecordService.getById() tenant lain -> not found", async () => {
      const tenantA = await setupTenant();
      const tenantB = await setupTenant();
      const actorCtxA = { tenantId: tenantA.fixture.tenantId, userId: tenantA.qcInspector.id };

      const ncr = await tenantContextStorage.run(actorCtxA, () =>
        ncrRecordService.create({
          siteId: tenantA.siteId,
          ncrSource: "INTERNAL",
          title: "NCR Rahasia Tenant A",
          description: "Isolasi RLS",
          detectedDate: new Date(),
          detectionStage: "IN_PROCESS",
          severity: "MINOR",
          quantityNonconforming: 1,
          unitOfMeasure: "pcs",
        }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.fixture.tenantId, userId: tenantB.qcInspector.id }, () => ncrRecordService.getById(ncr.id)),
      ).rejects.toThrow();
    }, 20000);
  });
});
