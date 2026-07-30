import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { seedCapaNotificationTemplates } from "../../prisma/seed-capa-notification-templates";
import { AuditFindingService } from "../../src/modules/domains/audit/audit-finding.service";
import { AuditReportService } from "../../src/modules/domains/audit/audit-report.service";
import { AuditService } from "../../src/modules/domains/audit/audit.service";
import { CapaActionPlanService } from "../../src/modules/domains/capa/capa-action-plan.service";
import { CapaEffectivenessVerificationDueScanService } from "../../src/modules/domains/capa/capa-effectiveness-verification-due-scan.service";
import { CapaEffectivenessVerificationService } from "../../src/modules/domains/capa/capa-effectiveness-verification.service";
import { CapaRegisterService } from "../../src/modules/domains/capa/capa-register.service";
import { CapaRootCauseAnalysisService } from "../../src/modules/domains/capa/capa-root-cause-analysis.service";
import { CapaRootCauseSlaScanService } from "../../src/modules/domains/capa/capa-root-cause-sla-scan.service";
import { IncidentCorrectiveActionLinkService } from "../../src/modules/domains/incident/incident-corrective-action-link.service";
import { IncidentInvestigationService } from "../../src/modules/domains/incident/incident-investigation.service";
import { IncidentReportService } from "../../src/modules/domains/incident/incident-report.service";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import {
  adminPrisma,
  assignRole,
  createTestApp,
  flushTestRedis,
  seedAuditTypeAndChecklist,
  seedSite,
  seedTenantFixture,
  seedUserInTenant,
} from "./test-helpers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Task 4.2 (Modul 10 CAPA Management) — cakupan: **E2E-2** (Incident penuh:
 * lapor->investigasi->root cause->link CAPA->root cause CAPA->action
 * plan->approve->effectiveness verify EFFECTIVE->EFFECTIVE_CLOSED,
 * incident_corrective_actions.capa_status_cache ikut ter-update), **E2E-6**
 * (Audit MAJOR_NC->CAPA OTOMATIS via AuditFindingCapaTriggerListener->siklus
 * penuh sama->EFFECTIVE_CLOSED->audit_findings.status CLOSED->audit close
 * gate lolos), BR-01 (EFFECTIVE_CLOSED wajib lewat verification result=
 * EFFECTIVE), BR-02 (seluruh action plan wajib COMPLETED), BR-03
 * (segregation of duty verifier!=PIC), BR-04 (NOT_EFFECTIVE->REOPENED->
 * siklus ulang), BR-05 (source validation utk 3 kontrak konkret vs
 * source_type lain TIDAK divalidasi), BR-08 (action_tracking_id wajib
 * sebelum submit approval), KEDUA workflow (capa_action_plan,
 * capa_effectiveness_verification), 2 scan job, isolasi tenant RLS.
 */
describe("CAPA Management — Modul 10 (task 4.2)", () => {
  let app: INestApplication;
  let capaRegisterService: CapaRegisterService;
  let rootCauseAnalysisService: CapaRootCauseAnalysisService;
  let actionPlanService: CapaActionPlanService;
  let effectivenessVerificationService: CapaEffectivenessVerificationService;
  let rootCauseSlaScanService: CapaRootCauseSlaScanService;
  let effectivenessVerificationDueScanService: CapaEffectivenessVerificationDueScanService;
  let workflowEngineService: WorkflowEngineService;
  let incidentReportService: IncidentReportService;
  let incidentInvestigationService: IncidentInvestigationService;
  let correctiveActionLinkService: IncidentCorrectiveActionLinkService;
  let auditService: AuditService;
  let findingService: AuditFindingService;
  let auditReportService: AuditReportService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    capaRegisterService = app.get(CapaRegisterService);
    rootCauseAnalysisService = app.get(CapaRootCauseAnalysisService);
    actionPlanService = app.get(CapaActionPlanService);
    effectivenessVerificationService = app.get(CapaEffectivenessVerificationService);
    rootCauseSlaScanService = app.get(CapaRootCauseSlaScanService);
    effectivenessVerificationDueScanService = app.get(CapaEffectivenessVerificationDueScanService);
    workflowEngineService = app.get(WorkflowEngineService);
    incidentReportService = app.get(IncidentReportService);
    incidentInvestigationService = app.get(IncidentInvestigationService);
    correctiveActionLinkService = app.get(IncidentCorrectiveActionLinkService);
    auditService = app.get(AuditService);
    findingService = app.get(AuditFindingService);
    auditReportService = app.get(AuditReportService);
    await seedCapaNotificationTemplates(adminPrisma);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function setupTenant() {
    const fixture = await seedTenantFixture();
    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    const hseOfficer = await seedUserInTenant(fixture.tenantId, "HSE Officer");
    await assignRole(fixture.tenantId, hseOfficer.id, "HSE_OFFICER");
    const leadAuditor = await seedUserInTenant(fixture.tenantId, "Lead Auditor");
    const picUser = await seedUserInTenant(fixture.tenantId, "PIC Action Plan");
    const verifierUser = await seedUserInTenant(fixture.tenantId, "Effectiveness Verifier");
    const { siteId } = await seedSite(fixture.tenantId, fixture.userId);
    return { fixture, hseManager, hseOfficer, leadAuditor, picUser, verifierUser, siteId };
  }

  async function pendingTaskFor(instanceId: string) {
    return adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId, status: "PENDING" } });
  }

  /** DRAFT -> ... -> IN_PROGRESS (root cause + action plan define+track+submit+approve). */
  async function driveActionPlanToInProgress(
    tenantId: string,
    capaRegisterId: string,
    actorCtx: { tenantId: string; userId: string },
    hseManagerId: string,
    picUserId: string,
  ) {
    await tenantContextStorage.run(actorCtx, () =>
      rootCauseAnalysisService.record({
        capaRegisterId,
        method: "FIVE_WHY",
        methodDetail: { whys: ["kenapa?", "kenapa?"] },
        rootCauseSummary: "Prosedur tidak ditegakkan konsisten",
      }),
    );
    const actionPlan = await tenantContextStorage.run(actorCtx, () =>
      actionPlanService.define({
        capaRegisterId,
        actionDescription: "Refresh training APD",
        justification: "Root cause: kepatuhan APD rendah",
        actionType: "CORRECTIVE",
        picUserId,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      }),
    );
    await tenantContextStorage.run(actorCtx, () => actionPlanService.setActionTrackingId(actionPlan.id, randomUUID()));
    const submitted = await tenantContextStorage.run(actorCtx, () => actionPlanService.submitForApproval(capaRegisterId));
    const task = await pendingTaskFor(submitted.workflowInstanceId!);
    await tenantContextStorage.run({ tenantId, userId: hseManagerId }, () =>
      workflowEngineService.actOnTask(task.id, "APPROVE", undefined, hseManagerId),
    );
    await sleep(300);
    await tenantContextStorage.run(actorCtx, () => actionPlanService.updateStatusCache(actionPlan.id, "COMPLETED", new Date()));
    return actionPlan;
  }

  /** IN_PROGRESS -> PENDING_EFFECTIVENESS_VERIFICATION -> approve -> outcome. */
  async function driveEffectivenessVerificationToOutcome(
    tenantId: string,
    capaRegisterId: string,
    actorCtx: { tenantId: string; userId: string },
    hseManagerId: string,
    verifierUserId: string,
    result: "EFFECTIVE" | "NOT_EFFECTIVE",
  ) {
    const verification = await tenantContextStorage.run(actorCtx, () =>
      effectivenessVerificationService.create({
        capaRegisterId,
        verificationMethod: "FIELD_OBSERVATION",
        observationPeriodDays: 30,
        verificationDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        verifiedBy: verifierUserId,
      }),
    );
    await tenantContextStorage.run(actorCtx, () =>
      effectivenessVerificationService.recordResult(verification.id, { result, evidenceDescription: "Observasi lapangan 30 hari" }),
    );
    const submitted = await tenantContextStorage.run(actorCtx, () => effectivenessVerificationService.submitForApproval(verification.id));
    const task = await pendingTaskFor((await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } })).workflowInstanceId!);
    await tenantContextStorage.run({ tenantId, userId: hseManagerId }, () =>
      workflowEngineService.actOnTask(task.id, "APPROVE", undefined, hseManagerId),
    );
    await sleep(300);
    return submitted;
  }

  describe("E2E-2 — Incident -> CAPA siklus penuh -> EFFECTIVE_CLOSED, sync-back capa_status_cache", () => {
    it("lapor->investigasi->root cause->link CAPA (manual, PRD Modul 07 §4 poin 6 'investigator memicu')->siklus CAPA penuh->EFFECTIVE_CLOSED", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseOfficer.id };

      const report = await tenantContextStorage.run(actorCtx, () =>
        incidentReportService.create({
          siteId: t.siteId,
          initialClassification: "LOST_TIME_INJURY",
          incidentDatetime: new Date(),
          description: "Tangan terjepit mesin conveyor",
          reportedBy: t.hseOfficer.id,
        }),
      );
      await tenantContextStorage.run(actorCtx, () => incidentReportService.classify(report.id, "LOST_TIME_INJURY"));
      const investigation = await tenantContextStorage.run(actorCtx, () =>
        incidentInvestigationService.create({
          incidentReportId: report.id,
          method: "FIVE_WHY",
          leadInvestigatorId: t.hseOfficer.id,
          startedAt: new Date(),
          targetCompletionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        }),
      );
      await tenantContextStorage.run(actorCtx, () =>
        incidentInvestigationService.recordRootCause(investigation.id, {
          causeType: "ROOT_CAUSE",
          category: "PEOPLE",
          description: "Machine guard dilepas tanpa LOTO",
          sequenceNo: 1,
        }),
      );

      const capa = await tenantContextStorage.run(actorCtx, () =>
        capaRegisterService.create({
          sourceType: "INCIDENT",
          sourceId: report.id,
          sourceReferenceNumber: report.incidentNumber,
          category: "CORRECTIVE",
          priority: "HIGH",
          title: `Tindak lanjut ${report.incidentNumber}`,
          problemStatement: "Machine guard dilepas tanpa LOTO",
          siteId: t.siteId,
        }),
      );
      expect(capa.status).toBe("DRAFT");
      expect(capa.capaNumber).toContain("CAPA");

      const link = await tenantContextStorage.run(actorCtx, () =>
        correctiveActionLinkService.link({ incidentReportId: report.id, incidentInvestigationId: investigation.id, capaRegisterId: capa.id }),
      );
      expect(link.capaRegisterId).toBe(capa.id);

      await driveActionPlanToInProgress(t.fixture.tenantId, capa.id, actorCtx, t.hseManager.id, t.picUser.id);
      const capaInProgress = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: capa.id } });
      expect(capaInProgress.status).toBe("IN_PROGRESS");

      await driveEffectivenessVerificationToOutcome(t.fixture.tenantId, capa.id, actorCtx, t.hseManager.id, t.verifierUser.id, "EFFECTIVE");

      const capaClosed = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: capa.id } });
      expect(capaClosed.status).toBe("EFFECTIVE_CLOSED");
      expect(capaClosed.actualClosureDate).not.toBeNull();

      const linkAfter = await adminPrisma.incidentCorrectiveAction.findUniqueOrThrow({ where: { id: link.id } });
      expect(linkAfter.capaStatusCache).toBe("EFFECTIVE_CLOSED");

      const notifs = await adminPrisma.notification.findMany({ where: { entityId: capa.id, eventType: "CAPA_EFFECTIVE_CLOSED" } });
      expect(notifs.map((n) => n.recipientUserId)).toContain(capa.initiatedBy);
    }, 30000);
  });

  describe("E2E-6 — Audit MAJOR_NC -> CAPA OTOMATIS -> siklus penuh -> audit_findings CLOSED -> audit close gate lolos", () => {
    it("findingService.create(MAJOR_NC) memicu AuditFindingCapaTriggerListener -> capa_register real -> siklus penuh -> sync-back verify()+close()", async () => {
      const t = await setupTenant();
      const { auditTypeId, auditChecklistId } = await seedAuditTypeAndChecklist(t.fixture.tenantId, t.fixture.userId);
      const ctx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };

      const audit = await tenantContextStorage.run(ctx, () =>
        auditService.createAdHoc({
          siteId: t.siteId,
          auditTypeId,
          auditChecklistId,
          leadAuditorId: t.leadAuditor.id,
          plannedStartDate: new Date(),
          plannedEndDate: new Date(),
        }),
      );
      await tenantContextStorage.run(ctx, () => auditService.start(audit.id));
      const finding = await tenantContextStorage.run(ctx, () =>
        findingService.create({ auditId: audit.id, findingNumber: "F01", classification: "MAJOR_NC", description: "APD tidak dipakai" }),
      );

      await sleep(500);
      const findingAfterAutoLink = await adminPrisma.auditFinding.findUniqueOrThrow({ where: { id: finding.id } });
      expect(findingAfterAutoLink.status).toBe("CAPA_LINKED");
      expect(findingAfterAutoLink.capaRegisterId).not.toBeNull();
      const capaId = findingAfterAutoLink.capaRegisterId!;
      const capa = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: capaId } });
      expect(capa.sourceType).toBe("AUDIT_FINDING");
      expect(capa.sourceId).toBe(finding.id);
      expect(capa.priority).toBe("HIGH");

      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      await driveActionPlanToInProgress(t.fixture.tenantId, capaId, actorCtx, t.hseManager.id, t.picUser.id);
      await driveEffectivenessVerificationToOutcome(t.fixture.tenantId, capaId, actorCtx, t.hseManager.id, t.verifierUser.id, "EFFECTIVE");

      const capaClosed = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: capaId } });
      expect(capaClosed.status).toBe("EFFECTIVE_CLOSED");

      const findingAfterClose = await adminPrisma.auditFinding.findUniqueOrThrow({ where: { id: finding.id } });
      expect(findingAfterClose.status).toBe("CLOSED");
      expect(findingAfterClose.closedAt).not.toBeNull();

      // BR-03 audit close gate BUKAN cuma soal finding wajib-CAPA CLOSED —
      // audit_reports.status juga wajib APPROVED (workflow 2-stage TERPISAH
      // dari siklus CAPA finding di atas), pola PERSIS test/audit/audit-lifecycle
      // ("Stage 1 assignedTo = lead_auditor_id...").
      const report = await tenantContextStorage.run(ctx, () => auditReportService.create(audit.id));
      const submittedReport = await tenantContextStorage.run(ctx, () => auditReportService.submitForApproval(report.id));
      const reportTask1 = await pendingTaskFor(submittedReport.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: t.fixture.tenantId, userId: t.leadAuditor.id }, () =>
        workflowEngineService.actOnTask(reportTask1.id, "APPROVE", undefined, t.leadAuditor.id),
      );
      const reportTask2 = await pendingTaskFor(submittedReport.workflowInstanceId!);
      await tenantContextStorage.run(ctx, () => workflowEngineService.actOnTask(reportTask2.id, "APPROVE", undefined, t.hseManager.id));
      await sleep(300);

      const closedAudit = await tenantContextStorage.run(ctx, () => auditService.close(audit.id));
      expect(closedAudit.status).toBe("CLOSED");
    }, 30000);
  });

  describe("BR-01/BR-04 — NOT_EFFECTIVE -> NOT_EFFECTIVE_REOPENED -> root cause baru -> siklus ulang -> EFFECTIVE_CLOSED", () => {
    it("hasil verifikasi pertama NOT_EFFECTIVE mereopen CAPA, siklus kedua EFFECTIVE menutup", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };

      const capa = await tenantContextStorage.run(actorCtx, () =>
        capaRegisterService.create({
          sourceType: "OTHER",
          category: "PREVENTIVE",
          priority: "MEDIUM",
          title: "CAPA inisiatif manual",
          problemStatement: "Uji siklus NOT_EFFECTIVE",
          siteId: t.siteId,
        }),
      );

      await driveActionPlanToInProgress(t.fixture.tenantId, capa.id, actorCtx, t.hseManager.id, t.picUser.id);
      await driveEffectivenessVerificationToOutcome(t.fixture.tenantId, capa.id, actorCtx, t.hseManager.id, t.verifierUser.id, "NOT_EFFECTIVE");

      const reopened = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: capa.id } });
      expect(reopened.status).toBe("NOT_EFFECTIVE_REOPENED");
      expect(reopened.actualClosureDate).toBeNull();

      const notifs = await adminPrisma.notification.findMany({ where: { entityId: capa.id, eventType: "CAPA_NOT_EFFECTIVE_REOPENED" } });
      expect(notifs.map((n) => n.recipientUserId)).toContain(t.picUser.id);
      expect(notifs.map((n) => n.recipientUserId)).toContain(capa.initiatedBy);

      // BR-04 — siklus kedua WAJIB lewat root_cause_analysis baru (bukan
      // langsung ACTION_PLAN_DEFINED, ditegakkan by construction di
      // ALLOWED_TRANSITIONS: NOT_EFFECTIVE_REOPENED hanya -> ROOT_CAUSE_ANALYSIS).
      await driveActionPlanToInProgress(t.fixture.tenantId, capa.id, actorCtx, t.hseManager.id, t.picUser.id);
      await driveEffectivenessVerificationToOutcome(t.fixture.tenantId, capa.id, actorCtx, t.hseManager.id, t.verifierUser.id, "EFFECTIVE");

      const closed = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: capa.id } });
      expect(closed.status).toBe("EFFECTIVE_CLOSED");

      const rootCauses = await adminPrisma.capaRootCauseAnalysis.findMany({ where: { capaRegisterId: capa.id } });
      expect(rootCauses.length).toBe(2);
    }, 30000);
  });

  describe("BR-02 — action plan belum COMPLETED semua", () => {
    it("effectivenessVerificationService.create() ditolak selama masih ada action plan non-COMPLETED", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };

      const capa = await tenantContextStorage.run(actorCtx, () =>
        capaRegisterService.create({
          sourceType: "OTHER",
          category: "CORRECTIVE",
          priority: "LOW",
          title: "CAPA BR-02",
          problemStatement: "Uji BR-02",
          siteId: t.siteId,
        }),
      );
      await tenantContextStorage.run(actorCtx, () =>
        rootCauseAnalysisService.record({
          capaRegisterId: capa.id,
          method: "FISHBONE",
          methodDetail: {},
          rootCauseSummary: "Root cause BR-02",
        }),
      );
      await tenantContextStorage.run(actorCtx, () =>
        actionPlanService.define({
          capaRegisterId: capa.id,
          actionDescription: "Action plan belum selesai",
          justification: "Uji BR-02",
          actionType: "CORRECTIVE",
          picUserId: t.picUser.id,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
      );
      // capa_register.status masih ACTION_PLAN_DEFINED (belum IN_PROGRESS)
      // -> validateCapaRegisterStatusTransition SENDIRI sudah menolak
      // (ACTION_PLAN_DEFINED tidak listed -> PENDING_EFFECTIVENESS_VERIFICATION),
      // TAPI assertion ini spesifik menguji BR-02 (pesan error-nya), bukan
      // transisi status generik.
      await expect(
        tenantContextStorage.run(actorCtx, () =>
          effectivenessVerificationService.create({
            capaRegisterId: capa.id,
            verificationMethod: "RE_INSPECTION",
            observationPeriodDays: 30,
            verificationDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            verifiedBy: t.verifierUser.id,
          }),
        ),
      ).rejects.toThrow(/Transisi capa_register\.status/);
    }, 20000);
  });

  describe("BR-03 — segregation of duty verifier != PIC", () => {
    it("verifiedBy sama dengan pic_user_id action plan -> ditolak", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };

      const capa = await tenantContextStorage.run(actorCtx, () =>
        capaRegisterService.create({
          sourceType: "OTHER",
          category: "CORRECTIVE",
          priority: "LOW",
          title: "CAPA BR-03",
          problemStatement: "Uji BR-03",
          siteId: t.siteId,
        }),
      );
      await driveActionPlanToInProgress(t.fixture.tenantId, capa.id, actorCtx, t.hseManager.id, t.picUser.id);

      await expect(
        tenantContextStorage.run(actorCtx, () =>
          effectivenessVerificationService.create({
            capaRegisterId: capa.id,
            verificationMethod: "OTHER",
            observationPeriodDays: 30,
            verificationDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            verifiedBy: t.picUser.id,
          }),
        ),
      ).rejects.toThrow(/BR-03/);
    }, 20000);
  });

  describe("BR-05 — source validation", () => {
    it("sourceType=AUDIT_FINDING dgn sourceId palsu -> ditolak", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      await expect(
        tenantContextStorage.run(actorCtx, () =>
          capaRegisterService.create({
            sourceType: "AUDIT_FINDING",
            sourceId: randomUUID(),
            category: "CORRECTIVE",
            priority: "MEDIUM",
            title: "CAPA BR-05 invalid",
            problemStatement: "Uji BR-05",
            siteId: t.siteId,
          }),
        ),
      ).rejects.toThrow();
    }, 15000);

    it("sourceType=OTHER TIDAK divalidasi terhadap tabel manapun — boleh sourceId apa pun", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const capa = await tenantContextStorage.run(actorCtx, () =>
        capaRegisterService.create({
          sourceType: "OTHER",
          sourceId: randomUUID(),
          category: "PREVENTIVE",
          priority: "LOW",
          title: "CAPA BR-05 OTHER",
          problemStatement: "Uji BR-05 OTHER",
          siteId: t.siteId,
        }),
      );
      expect(capa.status).toBe("DRAFT");
    }, 15000);
  });

  describe("BR-08 — action_tracking_id wajib sebelum submit approval", () => {
    it("submitForApproval() ditolak selama action_tracking_id NULL", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const capa = await tenantContextStorage.run(actorCtx, () =>
        capaRegisterService.create({
          sourceType: "OTHER",
          category: "CORRECTIVE",
          priority: "LOW",
          title: "CAPA BR-08",
          problemStatement: "Uji BR-08",
          siteId: t.siteId,
        }),
      );
      await tenantContextStorage.run(actorCtx, () =>
        rootCauseAnalysisService.record({ capaRegisterId: capa.id, method: "FIVE_WHY", methodDetail: {}, rootCauseSummary: "RC BR-08" }),
      );
      await tenantContextStorage.run(actorCtx, () =>
        actionPlanService.define({
          capaRegisterId: capa.id,
          actionDescription: "Action plan tanpa tracking",
          justification: "Uji BR-08",
          actionType: "CORRECTIVE",
          picUserId: t.picUser.id,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
      );
      await expect(tenantContextStorage.run(actorCtx, () => actionPlanService.submitForApproval(capa.id))).rejects.toThrow(/BR-08/);
    }, 20000);
  });

  describe("Scan jobs", () => {
    it("capa-root-cause-sla-scan: DRAFT >=7 hari -> notifikasi initiated_by + HSE Manager, idempotent", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const capa = await tenantContextStorage.run(actorCtx, () =>
        capaRegisterService.create({
          sourceType: "OTHER",
          category: "CORRECTIVE",
          priority: "MEDIUM",
          title: "CAPA scan root cause SLA",
          problemStatement: "Uji scan",
          siteId: t.siteId,
        }),
      );
      await adminPrisma.capaRegister.update({ where: { id: capa.id }, data: { initiatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } });

      await rootCauseSlaScanService.scan();

      const capaAfter = await adminPrisma.capaRegister.findUniqueOrThrow({ where: { id: capa.id } });
      expect(capaAfter.rootCauseSlaReminderSentAt).not.toBeNull();
      const notifs = await adminPrisma.notification.findMany({ where: { entityId: capa.id, eventType: "CAPA_ROOT_CAUSE_SLA_DUE" } });
      expect(notifs.map((n) => n.recipientUserId)).toContain(capa.initiatedBy);
      expect(notifs.map((n) => n.recipientUserId)).toContain(t.hseManager.id);

      await rootCauseSlaScanService.scan();
      const notifsAfterSecondScan = await adminPrisma.notification.findMany({ where: { entityId: capa.id, eventType: "CAPA_ROOT_CAUSE_SLA_DUE" } });
      expect(notifsAfterSecondScan.length).toBe(notifs.length);
    }, 20000);

    it("capa-effectiveness-verification-due-scan: due date lewat -> notifikasi verifier + HSE Manager, idempotent", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const capa = await tenantContextStorage.run(actorCtx, () =>
        capaRegisterService.create({
          sourceType: "OTHER",
          category: "CORRECTIVE",
          priority: "MEDIUM",
          title: "CAPA scan verification due",
          problemStatement: "Uji scan",
          siteId: t.siteId,
        }),
      );
      await driveActionPlanToInProgress(t.fixture.tenantId, capa.id, actorCtx, t.hseManager.id, t.picUser.id);
      const verification = await tenantContextStorage.run(actorCtx, () =>
        effectivenessVerificationService.create({
          capaRegisterId: capa.id,
          verificationMethod: "FIELD_OBSERVATION",
          observationPeriodDays: 30,
          verificationDueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          verifiedBy: t.verifierUser.id,
        }),
      );

      await effectivenessVerificationDueScanService.scan();

      const verificationAfter = await adminPrisma.capaEffectivenessVerification.findUniqueOrThrow({ where: { id: verification.id } });
      expect(verificationAfter.dueReminderSentAt).not.toBeNull();
      const notifs = await adminPrisma.notification.findMany({
        where: { entityId: verification.id, eventType: "CAPA_EFFECTIVENESS_VERIFICATION_DUE" },
      });
      expect(notifs.map((n) => n.recipientUserId)).toContain(t.verifierUser.id);
      expect(notifs.map((n) => n.recipientUserId)).toContain(t.hseManager.id);
    }, 20000);
  });

  describe("Isolasi tenant (RLS)", () => {
    it("capaRegisterService.getById() tenant lain -> not found", async () => {
      const tenantA = await setupTenant();
      const tenantB = await setupTenant();
      const actorCtxA = { tenantId: tenantA.fixture.tenantId, userId: tenantA.hseManager.id };

      const capa = await tenantContextStorage.run(actorCtxA, () =>
        capaRegisterService.create({
          sourceType: "OTHER",
          category: "CORRECTIVE",
          priority: "LOW",
          title: "CAPA Rahasia Tenant A",
          problemStatement: "Isolasi RLS",
          siteId: tenantA.siteId,
        }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.fixture.tenantId, userId: tenantB.hseManager.id }, () => capaRegisterService.getById(capa.id)),
      ).rejects.toThrow();
    }, 20000);
  });
});
