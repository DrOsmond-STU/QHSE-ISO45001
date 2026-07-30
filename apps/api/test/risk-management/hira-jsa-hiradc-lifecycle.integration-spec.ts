import { BadRequestException, ConflictException, INestApplication } from "@nestjs/common";
import { HazardRegisterService } from "../../src/modules/domains/risk-management/matrix/hazard-register.service";
import { RiskMatrixBootstrapService } from "../../src/modules/domains/risk-management/matrix/risk-matrix-bootstrap.service";
import { HiraAssessmentService } from "../../src/modules/domains/risk-management/hira-jsa-hiradc/hira-assessment.service";
import { HiraReviewDueScanService } from "../../src/modules/domains/risk-management/hira-jsa-hiradc/hira-review-due-scan.service";
import { HiradcExpiryScanService } from "../../src/modules/domains/risk-management/hira-jsa-hiradc/hiradc-expiry-scan.service";
import { HiradcRecordService } from "../../src/modules/domains/risk-management/hira-jsa-hiradc/hiradc-record.service";
import { JsaRecordService } from "../../src/modules/domains/risk-management/hira-jsa-hiradc/jsa-record.service";
import { RiskRegisterReviewScanService } from "../../src/modules/domains/risk-management/hira-jsa-hiradc/risk-register-review-scan.service";
import { RiskRegisterService } from "../../src/modules/domains/risk-management/hira-jsa-hiradc/risk-register.service";
import { RiskTreatmentPlanService } from "../../src/modules/domains/risk-management/hira-jsa-hiradc/risk-treatment-plan.service";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

/**
 * Task 3.2 (Modul 05 sisa — hira_assessments/jsa_records/hiradc_records/
 * risk_register/risk_treatment_plans) — cakupan: E2E-3 (percabangan
 * kondisional HIRA risiko EXTREME -> 3 stage, JSON Logic condition
 * SUNGGUHAN pertama di seluruh codebase pada workflow_transitions), BR-02
 * (kontrol wajib kalau risk_level_after masih HIGH/EXTREME), JSA 2 stage +
 * crew acknowledgement (1x per user per work_date), HIRADC BR-03
 * (baseline/mandiri) + self-verify vs workflow 1-stage, risk_register
 * inherent/residual otomatis + siklus status + BR-05, risk_treatment_plans
 * BR-06 (accept-gate EXTREME wajib Top Management), hazard_register BR-07
 * (task 121, referential block lintas submodul), ketiga scheduled job
 * (hiradc-expiry-scan/risk-register-review-scan/hira-review-due-scan),
 * isolasi tenant RLS.
 */
describe("Risk Management — Modul 05 HIRA/JSA/HIRADC/Risk Register (task 3.2)", () => {
  let app: INestApplication;
  let matrixBootstrapService: RiskMatrixBootstrapService;
  let hazardService: HazardRegisterService;
  let hiraService: HiraAssessmentService;
  let jsaService: JsaRecordService;
  let hiradcService: HiradcRecordService;
  let riskRegisterService: RiskRegisterService;
  let riskTreatmentService: RiskTreatmentPlanService;
  let workflowEngineService: WorkflowEngineService;
  let hiradcExpiryScanService: HiradcExpiryScanService;
  let riskRegisterReviewScanService: RiskRegisterReviewScanService;
  let hiraReviewDueScanService: HiraReviewDueScanService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    matrixBootstrapService = app.get(RiskMatrixBootstrapService);
    hazardService = app.get(HazardRegisterService);
    hiraService = app.get(HiraAssessmentService);
    jsaService = app.get(JsaRecordService);
    hiradcService = app.get(HiradcRecordService);
    riskRegisterService = app.get(RiskRegisterService);
    riskTreatmentService = app.get(RiskTreatmentPlanService);
    workflowEngineService = app.get(WorkflowEngineService);
    hiradcExpiryScanService = app.get(HiradcExpiryScanService);
    riskRegisterReviewScanService = app.get(RiskRegisterReviewScanService);
    hiraReviewDueScanService = app.get(HiraReviewDueScanService);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  /** Satu tenant lengkap: actor + Supervisor (stage 1 seluruh workflow
   * modul ini) + HSE Manager (stage 2 HIRA/JSA) + Company Admin (stage 3
   * HIRA kondisional EXTREME) + site/company + matriks default scope ALL
   * (fallback dipakai HIRA/JSA/HIRADC/CORPORATE_RISK semua, lihat banner
   * comment RiskMatrixConfigService.resolveActiveConfig() 2-tier 3.1). */
  async function setupTenant() {
    const fixture = await seedTenantFixture();
    const supervisor = await seedUserInTenant(fixture.tenantId, "Supervisor");
    await assignRole(fixture.tenantId, supervisor.id, "SUPERVISOR");
    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    const companyAdmin = await seedUserInTenant(fixture.tenantId, "Company Admin");
    await assignRole(fixture.tenantId, companyAdmin.id, "COMPANY_ADMIN");
    const { companyId, siteId } = await seedSite(fixture.tenantId, fixture.userId);
    const matrixConfig = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      matrixBootstrapService.ensureDefaultMatrix("ALL"),
    );
    return { fixture, supervisor, hseManager, companyAdmin, companyId, siteId, matrixConfigId: matrixConfig.id };
  }

  async function pendingTaskFor(instanceId: string) {
    return adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId, status: "PENDING" } });
  }

  describe("HIRA — E2E-3 percabangan kondisional workflow (JSON Logic condition pertama di codebase)", () => {
    it("TANPA hazard EXTREME (before): 2 stage saja, terminal APPROVED sesudah HSE Manager approve, TIDAK PERNAH ada task stage-3", async () => {
      const { fixture, supervisor, hseManager, siteId, matrixConfigId } = await setupTenant();
      const hira = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.create({ siteId, activityDescription: "Pekerjaan rutin gudang", assessmentType: "ROUTINE", riskMatrixConfigId: matrixConfigId, assessmentDate: new Date() }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.addHazardLine(hira.id, { hazardDescriptionFreetext: "Lantai licin", likelihoodBefore: 1, severityBefore: 1, likelihoodAfter: 1, severityAfter: 1 }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hiraService.submitForApproval(hira.id));
      expect(submitted.status).toBe("IN_REVIEW");

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task1.assignedTo).toBe(supervisor.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: supervisor.id }, () =>
        workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, supervisor.id),
      );

      const task2 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task2.assignedTo).toBe(hseManager.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        workflowEngineService.actOnTask(task2.id, "APPROVE", undefined, hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const instance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instance.status).toBe("APPROVED");
      expect(instance.contextData).toEqual({ hasExtremeHazard: false });

      const allTasks = await adminPrisma.workflowTask.findMany({ where: { instanceId: instance.id } });
      expect(allTasks).toHaveLength(2);

      const hiraAfter = await adminPrisma.hiraAssessment.findUniqueOrThrow({ where: { id: hira.id } });
      expect(hiraAfter.status).toBe("ACTIVE");
    }, 15000);

    it("DENGAN hazard EXTREME (before): 3 stage, terminal APPROVED sesudah Company HSE Head approve", async () => {
      const { fixture, supervisor, hseManager, companyAdmin, siteId, matrixConfigId } = await setupTenant();
      const hira = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.create({ siteId, activityDescription: "Pekerjaan confined space", assessmentType: "NON_ROUTINE", riskMatrixConfigId: matrixConfigId, assessmentDate: new Date() }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.addHazardLine(hira.id, {
          hazardDescriptionFreetext: "Ruang terbatas — kekurangan oksigen",
          likelihoodBefore: 5,
          severityBefore: 5,
          additionalControlsRequired: "Gas test + standby rescue team",
          likelihoodAfter: 1,
          severityAfter: 2,
        }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hiraService.submitForApproval(hira.id));

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: supervisor.id }, () =>
        workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, supervisor.id),
      );

      const task2 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task2.assignedTo).toBe(hseManager.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        workflowEngineService.actOnTask(task2.id, "APPROVE", undefined, hseManager.id),
      );

      // Percabangan: hasExtremeHazard=true -> stage3 dibuat (BUKAN langsung terminal spt kasus tanpa EXTREME di atas).
      const instanceMid = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instanceMid.status).toBe("IN_PROGRESS");
      const task3 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task3.assignedTo).toBe(companyAdmin.id);

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: companyAdmin.id }, () =>
        workflowEngineService.actOnTask(task3.id, "APPROVE", undefined, companyAdmin.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const instance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instance.status).toBe("APPROVED");
      expect(instance.contextData).toEqual({ hasExtremeHazard: true });

      const allTasks = await adminPrisma.workflowTask.findMany({ where: { instanceId: instance.id } });
      expect(allTasks).toHaveLength(3);

      const hiraAfter = await adminPrisma.hiraAssessment.findUniqueOrThrow({ where: { id: hira.id } });
      expect(hiraAfter.status).toBe("ACTIVE");
    }, 15000);

    it("reject di stage 1 -> REQUIRES_REVISION (status tersendiri, bukan DRAFT literal)", async () => {
      const { fixture, supervisor, siteId, matrixConfigId } = await setupTenant();
      const hira = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.create({ siteId, activityDescription: "Pekerjaan uji reject", assessmentType: "ROUTINE", riskMatrixConfigId: matrixConfigId, assessmentDate: new Date() }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.addHazardLine(hira.id, { hazardDescriptionFreetext: "Bahaya uji", likelihoodBefore: 1, severityBefore: 1, likelihoodAfter: 1, severityAfter: 1 }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hiraService.submitForApproval(hira.id));

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: supervisor.id }, () =>
        workflowEngineService.actOnTask(task1.id, "REJECT", "Belum lengkap", supervisor.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const hiraAfter = await adminPrisma.hiraAssessment.findUniqueOrThrow({ where: { id: hira.id } });
      expect(hiraAfter.status).toBe("REQUIRES_REVISION");
    }, 15000);

    it("BR-02: submitForApproval() menolak kalau risk_level_after masih HIGH/EXTREME tanpa additional_controls_required", async () => {
      const { fixture, siteId, matrixConfigId } = await setupTenant();
      const hira = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.create({ siteId, activityDescription: "Pekerjaan uji BR-02", assessmentType: "ROUTINE", riskMatrixConfigId: matrixConfigId, assessmentDate: new Date() }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.addHazardLine(hira.id, {
          hazardDescriptionFreetext: "Bahaya masih tinggi sesudah kontrol",
          likelihoodBefore: 3,
          severityBefore: 4,
          likelihoodAfter: 4,
          severityAfter: 4, // skor 16 -> EXTREME, requiresEscalation AFTER=true, TANPA additionalControlsRequired
        }),
      );
      // assertControlsPresentIfStillHighRisk() throw Error polos (bukan
      // BadRequestException) — pola sama pure-function guard 2.1/2.2/3.1.
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hiraService.submitForApproval(hira.id)),
      ).rejects.toThrow();
    });
  });

  describe("JSA — 2 stage + crew acknowledgement", () => {
    it("create -> addJobStep -> addStepHazard -> submit -> Supervisor approve -> HSE Manager approve -> ACTIVE, lalu crew acknowledge", async () => {
      const { fixture, supervisor, hseManager, siteId } = await setupTenant();
      const jsa = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        jsaService.create({ siteId, jobTitle: "Ganti oli mesin", preparedBy: fixture.userId, assessmentDate: new Date() }),
      );
      const step = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => jsaService.addJobStep(jsa.id, 1, "Matikan mesin & lockout"));
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        jsaService.addStepHazard(step.id, { hazardDescriptionFreetext: "Energi tersimpan", controlMeasures: "LOTO (lockout-tagout)" }),
      );

      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => jsaService.submitForApproval(jsa.id));
      expect(submitted.status).toBe("DRAFT"); // status TETAP DRAFT selama proses (pola JSA, beda dari HIRA)

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task1.assignedTo).toBe(supervisor.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: supervisor.id }, () =>
        workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, supervisor.id),
      );

      const task2 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task2.assignedTo).toBe(hseManager.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        workflowEngineService.actOnTask(task2.id, "APPROVE", undefined, hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const jsaAfter = await adminPrisma.jsaRecord.findUniqueOrThrow({ where: { id: jsa.id } });
      expect(jsaAfter.status).toBe("ACTIVE");

      const workDate = new Date("2026-08-01");
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => jsaService.acknowledge(jsa.id, fixture.userId, workDate));
      // Unique constraint DB (jsaId,userId,workDate) — P2002 diterjemahkan ConflictException.
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => jsaService.acknowledge(jsa.id, fixture.userId, workDate)),
      ).rejects.toThrow(ConflictException);
    }, 15000);

    it("reject -> status TETAP DRAFT, workflowInstanceId di-null-kan (bisa disubmit ulang)", async () => {
      const { fixture, supervisor, siteId } = await setupTenant();
      const jsa = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        jsaService.create({ siteId, jobTitle: "Uji reject JSA", preparedBy: fixture.userId, assessmentDate: new Date() }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => jsaService.addJobStep(jsa.id, 1, "Step uji"));
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => jsaService.submitForApproval(jsa.id));

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: supervisor.id }, () =>
        workflowEngineService.actOnTask(task1.id, "REJECT", "Kurang detail", supervisor.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const jsaAfter = await adminPrisma.jsaRecord.findUniqueOrThrow({ where: { id: jsa.id } });
      expect(jsaAfter.status).toBe("DRAFT");
      expect(jsaAfter.workflowInstanceId).toBeNull();
    }, 15000);

    it("acknowledge() menolak JSA yang belum ACTIVE", async () => {
      const { fixture, siteId } = await setupTenant();
      const jsa = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        jsaService.create({ siteId, jobTitle: "Belum aktif", preparedBy: fixture.userId, assessmentDate: new Date() }),
      );
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => jsaService.acknowledge(jsa.id, fixture.userId, new Date())),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("HIRADC — self-verify vs workflow 1-stage + BR-03", () => {
    it("BR-03: verify() ditolak TANPA related_hira_id/related_jsa_id DAN TANPA hiradc_lines", async () => {
      const { fixture, siteId } = await setupTenant();
      const hiradc = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiradcService.create({ siteId, taskDescription: "Kerja darurat tanpa baseline", performedBy: fixture.userId, assessmentDatetime: new Date(), validUntil: new Date(Date.now() + 8 * 60 * 60 * 1000) }),
      );
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hiradcService.verify(hiradc.id, false)),
      ).rejects.toThrow();
    });

    it("self-verify (useWorkflow=false) dgn baseline mandiri (hiradc_lines) -> DRAFT->VERIFIED langsung, lalu VERIFIED->APPROVED opsional", async () => {
      const { fixture, siteId } = await setupTenant();
      const hiradc = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiradcService.create({ siteId, taskDescription: "Kerja rutin risiko rendah", performedBy: fixture.userId, assessmentDatetime: new Date(), validUntil: new Date(Date.now() + 8 * 60 * 60 * 1000) }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiradcService.addLine(hiradc.id, { hazardDescriptionFreetext: "Terpeleset", likelihood: 1, severity: 1, controlMeasures: "Rambu peringatan" }),
      );
      const verified = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hiradcService.verify(hiradc.id, false));
      expect(verified.status).toBe("VERIFIED");

      const approved = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hiradcService.approve(hiradc.id));
      expect(approved.status).toBe("APPROVED");
    });

    it("via workflow (useWorkflow=true) -> Supervisor approve -> VERIFIED", async () => {
      const { fixture, supervisor, siteId } = await setupTenant();
      const hiradc = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiradcService.create({ siteId, taskDescription: "Kerja panas", performedBy: fixture.userId, assessmentDatetime: new Date(), validUntil: new Date(Date.now() + 4 * 60 * 60 * 1000) }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiradcService.addLine(hiradc.id, { hazardDescriptionFreetext: "Percikan api", likelihood: 2, severity: 3, controlMeasures: "Fire watch + APAR" }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hiradcService.verify(hiradc.id, true));
      expect(submitted.status).toBe("DRAFT"); // status TETAP DRAFT sampai listener proses APPROVED

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task1.assignedTo).toBe(supervisor.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: supervisor.id }, () =>
        workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, supervisor.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const hiradcAfter = await adminPrisma.hiradcRecord.findUniqueOrThrow({ where: { id: hiradc.id } });
      expect(hiradcAfter.status).toBe("VERIFIED");
    }, 15000);

    it("via workflow, reject -> status TETAP DRAFT, workflowInstanceId di-null-kan", async () => {
      const { fixture, supervisor, siteId } = await setupTenant();
      const hiradc = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiradcService.create({ siteId, taskDescription: "Uji reject HIRADC", performedBy: fixture.userId, assessmentDatetime: new Date(), validUntil: new Date(Date.now() + 4 * 60 * 60 * 1000) }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiradcService.addLine(hiradc.id, { hazardDescriptionFreetext: "Uji", likelihood: 1, severity: 1, controlMeasures: "Kontrol uji" }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hiradcService.verify(hiradc.id, true));

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: supervisor.id }, () =>
        workflowEngineService.actOnTask(task1.id, "REJECT", "Kontrol kurang", supervisor.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const hiradcAfter = await adminPrisma.hiradcRecord.findUniqueOrThrow({ where: { id: hiradc.id } });
      expect(hiradcAfter.status).toBe("DRAFT");
      expect(hiradcAfter.workflowInstanceId).toBeNull();
    }, 15000);

    it("BR-03: verify() diterima TANPA hiradc_lines kalau related_hira_id terisi (baseline)", async () => {
      const { fixture, siteId, matrixConfigId } = await setupTenant();
      const hira = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.create({ siteId, activityDescription: "Baseline utk HIRADC", assessmentType: "ROUTINE", riskMatrixConfigId: matrixConfigId, assessmentDate: new Date() }),
      );
      const hiradc = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiradcService.create({
          siteId,
          relatedHiraId: hira.id,
          taskDescription: "Kerja dgn baseline HIRA",
          performedBy: fixture.userId,
          assessmentDatetime: new Date(),
          validUntil: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      const verified = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hiradcService.verify(hiradc.id, false));
      expect(verified.status).toBe("VERIFIED");
    });
  });

  describe("Risk Register — inherent/residual otomatis + siklus status + BR-05 review", () => {
    it("create() menghitung inherent+residual dari matriks, requiresEscalation+riskAppetiteStatus diturunkan dari residual, lalu siklus status penuh", async () => {
      const { fixture, companyId, matrixConfigId } = await setupTenant();
      const risk = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskRegisterService.create({
          companyId,
          riskCategory: "OPERATIONAL",
          riskTitle: "Gangguan rantai pasok",
          riskDescription: "Ketergantungan 1 pemasok tunggal",
          riskOwnerUserId: fixture.userId,
          riskMatrixConfigId: matrixConfigId,
          likelihoodInherent: 5,
          severityInherent: 5,
          likelihoodResidual: 5,
          severityResidual: 5,
          identifiedDate: new Date(),
        }),
      );
      expect(risk.riskScoreInherent).toBe(25);
      expect(risk.riskLevelInherent).toBe("EXTREME");
      expect(risk.riskScoreResidual).toBe(25);
      expect(risk.requiresEscalation).toBe(true);
      expect(risk.riskAppetiteStatus).toBe("EXCEEDS_APPETITE");
      expect(risk.status).toBe("IDENTIFIED");
      expect(risk.riskNumber).toBeTruthy();

      const updated = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskRegisterService.updateResidual(risk.id, { likelihoodResidual: 1, severityResidual: 1, currentControls: "Kontrak jangka panjang + pemasok cadangan" }),
      );
      expect(updated.riskScoreResidual).toBe(1);
      expect(updated.requiresEscalation).toBe(false);
      expect(updated.riskAppetiteStatus).toBe("WITHIN_APPETITE");
      expect(updated.riskScoreInherent).toBe(25); // inherent TIDAK pernah berubah retroaktif

      const assessed = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => riskRegisterService.advanceStatus(risk.id, "ASSESSED"));
      expect(assessed.status).toBe("ASSESSED");
      const inTreatment = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskRegisterService.advanceStatus(risk.id, "TREATMENT_IN_PROGRESS"),
      );
      expect(inTreatment.status).toBe("TREATMENT_IN_PROGRESS");
      const monitored = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => riskRegisterService.advanceStatus(risk.id, "MONITORED"));
      expect(monitored.status).toBe("MONITORED");
      const closed = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => riskRegisterService.advanceStatus(risk.id, "CLOSED"));
      expect(closed.status).toBe("CLOSED");

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => riskRegisterService.advanceStatus(risk.id, "MONITORED")),
      ).rejects.toThrow(); // CLOSED terminal, tidak bisa mundur
    });

    it("recordReview() mereset overdueNotifiedAt begitu review genuinely dilakukan", async () => {
      const { fixture, matrixConfigId } = await setupTenant();
      const risk = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskRegisterService.create({
          riskCategory: "HSE",
          riskTitle: "Uji review",
          riskDescription: "Uji BR-05",
          riskOwnerUserId: fixture.userId,
          riskMatrixConfigId: matrixConfigId,
          likelihoodInherent: 2,
          severityInherent: 2,
          likelihoodResidual: 1,
          severityResidual: 1,
          identifiedDate: new Date(),
        }),
      );
      await adminPrisma.riskRegister.update({ where: { id: risk.id }, data: { overdueNotifiedAt: new Date() } });
      const reviewed = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskRegisterService.recordReview(risk.id, new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
      );
      expect(reviewed.overdueNotifiedAt).toBeNull();
      expect(reviewed.lastReviewDate).not.toBeNull();
    });
  });

  describe("Risk Treatment Plan — BR-06 accept-gate", () => {
    it("ACCEPT pada source requiresEscalation=true TANPA topManagementApprovedBy -> ditolak", async () => {
      const { fixture, matrixConfigId } = await setupTenant();
      const risk = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskRegisterService.create({
          riskCategory: "HSE",
          riskTitle: "Risiko EXTREME BR-06",
          riskDescription: "Uji",
          riskOwnerUserId: fixture.userId,
          riskMatrixConfigId: matrixConfigId,
          likelihoodInherent: 5,
          severityInherent: 5,
          likelihoodResidual: 5,
          severityResidual: 5,
          identifiedDate: new Date(),
        }),
      );
      expect(risk.requiresEscalation).toBe(true);

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          riskTreatmentService.create({
            sourceType: "RISK_REGISTER",
            sourceId: risk.id,
            treatmentStrategy: "ACCEPT",
            treatmentDescription: "Terima risiko begitu saja",
            responsibleUserId: fixture.userId,
            targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }),
        ),
      ).rejects.toThrow();
    });

    it("ACCEPT pada source requiresEscalation=true DENGAN topManagementApprovedBy -> diterima", async () => {
      const { fixture, companyAdmin, matrixConfigId } = await setupTenant();
      const risk = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskRegisterService.create({
          riskCategory: "HSE",
          riskTitle: "Risiko EXTREME BR-06 disetujui",
          riskDescription: "Uji",
          riskOwnerUserId: fixture.userId,
          riskMatrixConfigId: matrixConfigId,
          likelihoodInherent: 5,
          severityInherent: 5,
          likelihoodResidual: 5,
          severityResidual: 5,
          identifiedDate: new Date(),
        }),
      );

      const plan = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskTreatmentService.create({
          sourceType: "RISK_REGISTER",
          sourceId: risk.id,
          treatmentStrategy: "ACCEPT",
          treatmentDescription: "Diterima Top Management",
          responsibleUserId: fixture.userId,
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          topManagementApprovedBy: companyAdmin.id,
        }),
      );
      expect(plan.status).toBe("PLANNED");
      expect(plan.topManagementApprovedAt).not.toBeNull();
    });

    it("strategi selain ACCEPT (mis. REDUCE_MITIGATE) pada source EXTREME TIDAK butuh topManagementApprovedBy, lalu siklus status penuh", async () => {
      const { fixture, matrixConfigId } = await setupTenant();
      const risk = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskRegisterService.create({
          riskCategory: "HSE",
          riskTitle: "Risiko EXTREME mitigasi",
          riskDescription: "Uji",
          riskOwnerUserId: fixture.userId,
          riskMatrixConfigId: matrixConfigId,
          likelihoodInherent: 5,
          severityInherent: 5,
          likelihoodResidual: 5,
          severityResidual: 5,
          identifiedDate: new Date(),
        }),
      );
      const plan = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskTreatmentService.create({
          sourceType: "RISK_REGISTER",
          sourceId: risk.id,
          treatmentStrategy: "REDUCE_MITIGATE",
          treatmentDescription: "Tambah kontrol",
          responsibleUserId: fixture.userId,
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      );
      expect(plan.status).toBe("PLANNED");

      const inProgress = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => riskTreatmentService.updateStatus(plan.id, "IN_PROGRESS"));
      expect(inProgress.status).toBe("IN_PROGRESS");
      const completed = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => riskTreatmentService.updateStatus(plan.id, "COMPLETED"));
      expect(completed.status).toBe("COMPLETED");
      const verified = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => riskTreatmentService.updateStatus(plan.id, "VERIFIED_EFFECTIVE"));
      expect(verified.status).toBe("VERIFIED_EFFECTIVE");

      const list = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => riskTreatmentService.listBySource("RISK_REGISTER", risk.id));
      expect(list.map((p) => p.id)).toContain(plan.id);
    });
  });

  describe("Hazard Register BR-07 (task 121) — referential block lintas submodul (risk-management/matrix <-> risk-management/hira-jsa-hiradc)", () => {
    it("retire() ditolak selama masih direferensikan hira_hazard_lines", async () => {
      const { fixture, siteId, matrixConfigId } = await setupTenant();
      const hazard = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hazardService.create({ hazardCategory: "MECHANICAL", hazardDescription: "Mesin berputar BR-07" }),
      );
      const hira = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.create({ siteId, activityDescription: "Uji BR-07", assessmentType: "ROUTINE", riskMatrixConfigId: matrixConfigId, assessmentDate: new Date() }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.addHazardLine(hira.id, { hazardId: hazard.id, likelihoodBefore: 1, severityBefore: 1, likelihoodAfter: 1, severityAfter: 1 }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hazardService.retire(hazard.id)),
      ).rejects.toThrow(ConflictException);
    });

    it("retire() diterima kalau TIDAK ada referensi sama sekali", async () => {
      const { fixture } = await setupTenant();
      const hazard = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hazardService.create({ hazardCategory: "OTHER", hazardDescription: "Tidak dipakai" }),
      );
      const retired = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hazardService.retire(hazard.id));
      expect(retired.status).toBe("INACTIVE");
    });
  });

  describe("Scheduled jobs", () => {
    it("hiradc-expiry-scan (BR-04): valid_until terlewati -> status EXPIRED", async () => {
      const { fixture, siteId } = await setupTenant();
      const hiradc = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiradcService.create({
          siteId,
          taskDescription: "HIRADC kadaluarsa",
          performedBy: fixture.userId,
          assessmentDatetime: new Date(Date.now() - 10 * 60 * 60 * 1000),
          validUntil: new Date(Date.now() - 60 * 60 * 1000),
        }),
      );
      await hiradcExpiryScanService.scan();
      const after = await adminPrisma.hiradcRecord.findUniqueOrThrow({ where: { id: hiradc.id } });
      expect(after.status).toBe("EXPIRED");
    });

    it("risk-register-review-scan (BR-05 risk_register + overdue risk_treatment_plans, satu job): keduanya ditandai overdueNotifiedAt", async () => {
      const { fixture, matrixConfigId } = await setupTenant();
      const risk = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskRegisterService.create({
          riskCategory: "HSE",
          riskTitle: "Risiko overdue scan",
          riskDescription: "Uji",
          riskOwnerUserId: fixture.userId,
          riskMatrixConfigId: matrixConfigId,
          likelihoodInherent: 1,
          severityInherent: 1,
          likelihoodResidual: 1,
          severityResidual: 1,
          identifiedDate: new Date(),
          nextReviewDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        }),
      );
      const plan = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        riskTreatmentService.create({
          sourceType: "RISK_REGISTER",
          sourceId: risk.id,
          treatmentStrategy: "REDUCE_MITIGATE",
          treatmentDescription: "Rencana overdue",
          responsibleUserId: fixture.userId,
          targetDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        }),
      );

      await riskRegisterReviewScanService.scan();

      const riskAfter = await adminPrisma.riskRegister.findUniqueOrThrow({ where: { id: risk.id } });
      expect(riskAfter.overdueNotifiedAt).not.toBeNull();
      const planAfter = await adminPrisma.riskTreatmentPlan.findUniqueOrThrow({ where: { id: plan.id } });
      expect(planAfter.overdueNotifiedAt).not.toBeNull();
    });

    it("hira-review-due-scan: HIRA ACTIVE dgn review_due_date dlm 30 hari -> reviewReminderSentAt terisi", async () => {
      const { fixture, supervisor, hseManager, siteId, matrixConfigId } = await setupTenant();
      const hira = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.create({
          siteId,
          activityDescription: "Uji review due",
          assessmentType: "PERIODIC_REVIEW",
          riskMatrixConfigId: matrixConfigId,
          assessmentDate: new Date(),
          reviewDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        hiraService.addHazardLine(hira.id, { hazardDescriptionFreetext: "Uji", likelihoodBefore: 1, severityBefore: 1, likelihoodAfter: 1, severityAfter: 1 }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => hiraService.submitForApproval(hira.id));
      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: supervisor.id }, () =>
        workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, supervisor.id),
      );
      const task2 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        workflowEngineService.actOnTask(task2.id, "APPROVE", undefined, hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const hiraActive = await adminPrisma.hiraAssessment.findUniqueOrThrow({ where: { id: hira.id } });
      expect(hiraActive.status).toBe("ACTIVE");

      await hiraReviewDueScanService.scan();
      const after = await adminPrisma.hiraAssessment.findUniqueOrThrow({ where: { id: hira.id } });
      expect(after.reviewReminderSentAt).not.toBeNull();
    }, 15000);
  });

  describe("Isolasi tenant (RLS)", () => {
    it("hira_assessments/jsa_records/hiradc_records/risk_register tenant A tidak terlihat dari context tenant B", async () => {
      const tenantA = await setupTenant();
      const tenantB = await seedTenantFixture();

      const hira = await tenantContextStorage.run({ tenantId: tenantA.fixture.tenantId, userId: tenantA.fixture.userId }, () =>
        hiraService.create({ siteId: tenantA.siteId, activityDescription: "Rahasia tenant A", assessmentType: "ROUTINE", riskMatrixConfigId: tenantA.matrixConfigId, assessmentDate: new Date() }),
      );
      const jsa = await tenantContextStorage.run({ tenantId: tenantA.fixture.tenantId, userId: tenantA.fixture.userId }, () =>
        jsaService.create({ siteId: tenantA.siteId, jobTitle: "Rahasia JSA tenant A", preparedBy: tenantA.fixture.userId, assessmentDate: new Date() }),
      );
      const hiradc = await tenantContextStorage.run({ tenantId: tenantA.fixture.tenantId, userId: tenantA.fixture.userId }, () =>
        hiradcService.create({
          siteId: tenantA.siteId,
          taskDescription: "Rahasia HIRADC tenant A",
          performedBy: tenantA.fixture.userId,
          assessmentDatetime: new Date(),
          validUntil: new Date(Date.now() + 60 * 60 * 1000),
        }),
      );
      const risk = await tenantContextStorage.run({ tenantId: tenantA.fixture.tenantId, userId: tenantA.fixture.userId }, () =>
        riskRegisterService.create({
          riskCategory: "OTHER",
          riskTitle: "Rahasia risk register tenant A",
          riskDescription: "Uji RLS",
          riskOwnerUserId: tenantA.fixture.userId,
          riskMatrixConfigId: tenantA.matrixConfigId,
          likelihoodInherent: 1,
          severityInherent: 1,
          likelihoodResidual: 1,
          severityResidual: 1,
          identifiedDate: new Date(),
        }),
      );

      await expect(tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => hiraService.getById(hira.id))).rejects.toThrow();
      await expect(tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => jsaService.getById(jsa.id))).rejects.toThrow();
      await expect(tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => hiradcService.getById(hiradc.id))).rejects.toThrow();
      await expect(tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => riskRegisterService.getById(risk.id))).rejects.toThrow();
    });
  });
});
