import { INestApplication } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { seedAuditNotificationTemplates } from "../../prisma/seed-audit-notification-templates";
import { AuditFindingClosureDueScanService } from "../../src/modules/domains/audit/audit-finding-closure-due-scan.service";
import { AuditFindingCapaRequiredEvent, AuditFindingService, AUDIT_FINDING_CAPA_REQUIRED_EVENT } from "../../src/modules/domains/audit/audit-finding.service";
import { AuditProgramService } from "../../src/modules/domains/audit/audit-program.service";
import { AuditReportService } from "../../src/modules/domains/audit/audit-report.service";
import { AuditTeamMemberService } from "../../src/modules/domains/audit/audit-team-member.service";
import { AuditAuditeeScopeService } from "../../src/modules/domains/audit/audit-auditee-scope.service";
import { AuditService } from "../../src/modules/domains/audit/audit.service";
import { AuditorCompetencyExpiryScanService } from "../../src/modules/domains/audit/auditor-competency-expiry-scan.service";
import { AuditorCompetencyRecordService } from "../../src/modules/domains/audit/auditor-competency-record.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import {
  adminPrisma,
  assignRole,
  createTestApp,
  flushTestRedis,
  seedAuditTypeAndChecklist,
  seedDepartment,
  seedSite,
  seedTenantFixture,
  seedUserInTenant,
} from "./test-helpers";

/**
 * Task 4.1 (Modul 09 Audit Management) — cakupan: audit_programs 2-stage
 * workflow (Review MR -> Approval Top Management), plan item -> audit
 * instance creation (BR-06 immutability), BR-07 (independensi auditor),
 * BR-01 (soft warning kompetensi), BR-04/BR-05 (target_closure_date +
 * rekalkulasi), event stub CAPA, audit_report 2-stage workflow dgn
 * approverType=CONTEXT_USER (Lead Auditor per-entitas), BR-02/BR-03 (gate
 * closure), 2 scan job, isolasi tenant RLS.
 */
describe("Audit Management — Modul 09 (task 4.1)", () => {
  let app: INestApplication;
  let programService: AuditProgramService;
  let auditService: AuditService;
  let teamMemberService: AuditTeamMemberService;
  let auditeeScopeService: AuditAuditeeScopeService;
  let findingService: AuditFindingService;
  let competencyService: AuditorCompetencyRecordService;
  let reportService: AuditReportService;
  let competencyExpiryScanService: AuditorCompetencyExpiryScanService;
  let findingClosureDueScanService: AuditFindingClosureDueScanService;
  let workflowEngineService: WorkflowEngineService;
  let eventEmitter: EventEmitter2;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    programService = app.get(AuditProgramService);
    auditService = app.get(AuditService);
    teamMemberService = app.get(AuditTeamMemberService);
    auditeeScopeService = app.get(AuditAuditeeScopeService);
    findingService = app.get(AuditFindingService);
    competencyService = app.get(AuditorCompetencyRecordService);
    reportService = app.get(AuditReportService);
    competencyExpiryScanService = app.get(AuditorCompetencyExpiryScanService);
    findingClosureDueScanService = app.get(AuditFindingClosureDueScanService);
    workflowEngineService = app.get(WorkflowEngineService);
    eventEmitter = app.get(EventEmitter2);
    await seedAuditNotificationTemplates(adminPrisma);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function setupTenant() {
    const fixture = await seedTenantFixture();
    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    const companyAdmin = await seedUserInTenant(fixture.tenantId, "Company Admin");
    await assignRole(fixture.tenantId, companyAdmin.id, "COMPANY_ADMIN");
    const leadAuditor = await seedUserInTenant(fixture.tenantId, "Lead Auditor");
    await assignRole(fixture.tenantId, leadAuditor.id, "HSE_OFFICER");
    const site = await seedSite(fixture.tenantId, fixture.userId);
    const { auditTypeId, auditChecklistId, standardCode } = await seedAuditTypeAndChecklist(fixture.tenantId, fixture.userId);
    return { fixture, hseManager, companyAdmin, leadAuditor, ...site, auditTypeId, auditChecklistId, standardCode };
  }

  async function pendingTaskFor(instanceId: string) {
    return adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId, status: "PENDING" } });
  }

  describe("audit_program — 2-stage workflow (Review MR -> Approval Top Management)", () => {
    it("submit -> approve kedua stage -> APPROVED (status TETAP DRAFT selama instance IN_PROGRESS)", async () => {
      const t = await setupTenant();
      const ctxManager = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const ctxAdmin = { tenantId: t.fixture.tenantId, userId: t.companyAdmin.id };

      const program = await tenantContextStorage.run(ctxManager, () =>
        programService.create({
          companyId: t.companyId,
          programYear: 2027,
          name: "Program Audit Internal 2027",
          planItems: [{ plannedMonth: 3, auditTypeId: t.auditTypeId, siteId: t.siteId, standardReference: "ISO 45001" }],
        }),
      );
      expect(program.status).toBe("DRAFT");

      const submitted = await tenantContextStorage.run(ctxManager, () => programService.submitForApproval(program.id));
      expect(submitted.status).toBe("DRAFT");
      expect(submitted.workflowInstanceId).not.toBeNull();

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task1.assignedTo).toBe(t.hseManager.id);
      await tenantContextStorage.run(ctxManager, () => workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, t.hseManager.id));

      const instanceMid = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instanceMid.status).toBe("IN_PROGRESS");
      const programMid = await adminPrisma.auditProgram.findUniqueOrThrow({ where: { id: program.id } });
      expect(programMid.status).toBe("DRAFT");

      const task2 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task2.assignedTo).toBe(t.companyAdmin.id);
      await tenantContextStorage.run(ctxAdmin, () => workflowEngineService.actOnTask(task2.id, "APPROVE", undefined, t.companyAdmin.id));
      await new Promise((r) => setTimeout(r, 300));

      const programAfter = await adminPrisma.auditProgram.findUniqueOrThrow({ where: { id: program.id } });
      expect(programAfter.status).toBe("APPROVED");
      expect(programAfter.approvedAt).not.toBeNull();
      expect(programAfter.approvedBy).toBeNull();
    }, 20000);

    it("REJECTED -> program TETAP DRAFT, workflow_instance_id di-null-kan", async () => {
      const t = await setupTenant();
      const ctxManager = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };

      const program = await tenantContextStorage.run(ctxManager, () =>
        programService.create({ companyId: t.companyId, programYear: 2027, name: "Program Ditolak", planItems: [] }),
      );
      const submitted = await tenantContextStorage.run(ctxManager, () => programService.submitForApproval(program.id));
      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run(ctxManager, () =>
        workflowEngineService.actOnTask(task1.id, "REJECT", "Belum lengkap", t.hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const programAfter = await adminPrisma.auditProgram.findUniqueOrThrow({ where: { id: program.id } });
      expect(programAfter.status).toBe("DRAFT");
      expect(programAfter.workflowInstanceId).toBeNull();
    }, 15000);
  });

  describe("Plan item -> Audit instance creation (BR-06)", () => {
    it("createFromPlanItem mengisi linked_audit_id + plan item EXECUTED + program APPROVED->IN_PROGRESS", async () => {
      const t = await setupTenant();
      const ctxManager = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const ctxAdmin = { tenantId: t.fixture.tenantId, userId: t.companyAdmin.id };

      const program = await tenantContextStorage.run(ctxManager, () =>
        programService.create({
          companyId: t.companyId,
          programYear: 2027,
          name: "Program utk Audit",
          planItems: [{ plannedMonth: 5, auditTypeId: t.auditTypeId, standardReference: "ISO 45001" }],
        }),
      );
      const submitted = await tenantContextStorage.run(ctxManager, () => programService.submitForApproval(program.id));
      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run(ctxManager, () => workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, t.hseManager.id));
      const task2 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run(ctxAdmin, () => workflowEngineService.actOnTask(task2.id, "APPROVE", undefined, t.companyAdmin.id));
      await new Promise((r) => setTimeout(r, 300));

      const planItem = await adminPrisma.auditProgramPlanItem.findFirstOrThrow({ where: { auditProgramId: program.id } });

      const audit = await tenantContextStorage.run(ctxManager, () =>
        auditService.createFromPlanItem(planItem.id, {
          siteId: t.siteId,
          auditTypeId: t.auditTypeId,
          auditChecklistId: t.auditChecklistId,
          leadAuditorId: t.leadAuditor.id,
          plannedStartDate: new Date("2027-05-10"),
          plannedEndDate: new Date("2027-05-12"),
        }),
      );
      expect(audit.auditNumber).toContain("AUD");
      expect(audit.auditProgramPlanItemId).toBe(planItem.id);

      const planItemAfter = await adminPrisma.auditProgramPlanItem.findUniqueOrThrow({ where: { id: planItem.id } });
      expect(planItemAfter.status).toBe("EXECUTED");
      expect(planItemAfter.linkedAuditId).toBe(audit.id);

      const programAfter = await adminPrisma.auditProgram.findUniqueOrThrow({ where: { id: program.id } });
      expect(programAfter.status).toBe("IN_PROGRESS");

      await expect(
        tenantContextStorage.run(ctxManager, () =>
          auditService.createFromPlanItem(planItem.id, {
            siteId: t.siteId,
            auditTypeId: t.auditTypeId,
            auditChecklistId: t.auditChecklistId,
            leadAuditorId: t.leadAuditor.id,
            plannedStartDate: new Date(),
            plannedEndDate: new Date(),
          }),
        ),
      ).rejects.toThrow(/linked_audit_id/);
    }, 20000);
  });

  describe("BR-07 — independensi auditor", () => {
    it("menolak team member dari department yang sama dgn auditee scope, mengizinkan department berbeda", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const siteFixture = { companyId: t.companyId, branchId: t.branchId, siteId: t.siteId };
      const deptA = await seedDepartment(t.fixture.tenantId, siteFixture, t.fixture.userId, "Produksi");
      const deptB = await seedDepartment(t.fixture.tenantId, siteFixture, t.fixture.userId, "QHSE");
      const auditorFromDeptA = await seedUserInTenant(t.fixture.tenantId, "Auditor Dept A", { departmentId: deptA.id });
      const auditorFromDeptB = await seedUserInTenant(t.fixture.tenantId, "Auditor Dept B", { departmentId: deptB.id });

      const audit = await tenantContextStorage.run(ctx, () =>
        auditService.createAdHoc({
          siteId: t.siteId,
          auditTypeId: t.auditTypeId,
          auditChecklistId: t.auditChecklistId,
          leadAuditorId: t.leadAuditor.id,
          plannedStartDate: new Date(),
          plannedEndDate: new Date(),
        }),
      );
      await tenantContextStorage.run(ctx, () => auditeeScopeService.addScope(audit.id, { departmentId: deptA.id }));

      await expect(
        tenantContextStorage.run(ctx, () => teamMemberService.addMember(audit.id, { userId: auditorFromDeptA.id, roleInTeam: "AUDITOR" })),
      ).rejects.toThrow(/BR-07/);

      const member = await tenantContextStorage.run(ctx, () =>
        teamMemberService.addMember(audit.id, { userId: auditorFromDeptB.id, roleInTeam: "AUDITOR" }),
      );
      expect(member.userId).toBe(auditorFromDeptB.id);
    });
  });

  describe("BR-01 — soft warning kompetensi Lead Auditor", () => {
    it("start() mengembalikan warning kalau Lead Auditor tidak punya competency ACTIVE cocok, kosong kalau ada", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };

      const auditNoCompetency = await tenantContextStorage.run(ctx, () =>
        auditService.createAdHoc({
          siteId: t.siteId,
          auditTypeId: t.auditTypeId,
          auditChecklistId: t.auditChecklistId,
          leadAuditorId: t.leadAuditor.id,
          plannedStartDate: new Date(),
          plannedEndDate: new Date(),
        }),
      );
      await tenantContextStorage.run(ctx, () =>
        teamMemberService.addMember(auditNoCompetency.id, { userId: t.leadAuditor.id, roleInTeam: "LEAD_AUDITOR" }),
      );
      const resultWarn = await tenantContextStorage.run(ctx, () => auditService.start(auditNoCompetency.id));
      expect(resultWarn.audit.status).toBe("IN_PROGRESS");
      expect(resultWarn.competencyWarnings).toHaveLength(1);
      expect(resultWarn.competencyWarnings[0]).toContain("BR-01");

      const auditWithCompetency = await tenantContextStorage.run(ctx, () =>
        auditService.createAdHoc({
          siteId: t.siteId,
          auditTypeId: t.auditTypeId,
          auditChecklistId: t.auditChecklistId,
          leadAuditorId: t.leadAuditor.id,
          plannedStartDate: new Date(),
          plannedEndDate: new Date(),
        }),
      );
      await tenantContextStorage.run(ctx, () =>
        teamMemberService.addMember(auditWithCompetency.id, { userId: t.leadAuditor.id, roleInTeam: "LEAD_AUDITOR" }),
      );
      await tenantContextStorage.run(ctx, () =>
        competencyService.create({
          userId: t.leadAuditor.id,
          competencyType: "LEAD_AUDITOR_CERT",
          standardScope: t.standardCode,
          issuedDate: new Date("2025-01-01"),
        }),
      );
      const resultOk = await tenantContextStorage.run(ctx, () => auditService.start(auditWithCompetency.id));
      expect(resultOk.competencyWarnings).toHaveLength(0);
    });
  });

  describe("audit_findings — BR-04/BR-05, event stub CAPA", () => {
    it("MAJOR_NC -> requires_capa true, target_closure_date +30 hari, event audit.finding_capa_required ter-emit", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const audit = await tenantContextStorage.run(ctx, () =>
        auditService.createAdHoc({
          siteId: t.siteId,
          auditTypeId: t.auditTypeId,
          auditChecklistId: t.auditChecklistId,
          leadAuditorId: t.leadAuditor.id,
          plannedStartDate: new Date(),
          plannedEndDate: new Date(),
        }),
      );

      let captured: AuditFindingCapaRequiredEvent | undefined;
      const handler = (event: AuditFindingCapaRequiredEvent) => {
        captured = event;
      };
      eventEmitter.on(AUDIT_FINDING_CAPA_REQUIRED_EVENT, handler);
      let finding;
      try {
        finding = await tenantContextStorage.run(ctx, () =>
          findingService.create({
            auditId: audit.id,
            findingNumber: "F01",
            classification: "MAJOR_NC",
            description: "APD tidak dipakai di area produksi",
          }),
        );
        expect(captured).toBeDefined();
        expect(captured!.auditFindingId).toBe(finding.id);
      } finally {
        eventEmitter.off(AUDIT_FINDING_CAPA_REQUIRED_EVENT, handler);
      }

      expect(finding.requiresCapa).toBe(true);
      const expectedTarget = new Date(finding.identifiedAt);
      expectedTarget.setUTCDate(expectedTarget.getUTCDate() + 30);
      expect(finding.targetClosureDate?.toISOString().slice(0, 10)).toBe(expectedTarget.toISOString().slice(0, 10));
    });

    it("BR-05 — updateClassification MINOR_NC->MAJOR_NC merekalkulasi target_closure_date", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const audit = await tenantContextStorage.run(ctx, () =>
        auditService.createAdHoc({
          siteId: t.siteId,
          auditTypeId: t.auditTypeId,
          auditChecklistId: t.auditChecklistId,
          leadAuditorId: t.leadAuditor.id,
          plannedStartDate: new Date(),
          plannedEndDate: new Date(),
        }),
      );
      const finding = await tenantContextStorage.run(ctx, () =>
        findingService.create({ auditId: audit.id, findingNumber: "F02", classification: "MINOR_NC", description: "Housekeeping kurang" }),
      );
      const expectedMinorTarget = new Date(finding.identifiedAt);
      expectedMinorTarget.setUTCDate(expectedMinorTarget.getUTCDate() + 60);
      expect(finding.targetClosureDate?.toISOString().slice(0, 10)).toBe(expectedMinorTarget.toISOString().slice(0, 10));

      const updated = await tenantContextStorage.run(ctx, () => findingService.updateClassification(finding.id, "MAJOR_NC"));
      const expectedMajorTarget = new Date(finding.identifiedAt);
      expectedMajorTarget.setUTCDate(expectedMajorTarget.getUTCDate() + 30);
      expect(updated.targetClosureDate?.toISOString().slice(0, 10)).toBe(expectedMajorTarget.toISOString().slice(0, 10));
    });
  });

  describe("audit_report — 2-stage workflow CONTEXT_USER + BR-02/BR-03 close gate", () => {
    it("Stage 1 assignedTo = lead_auditor_id (CONTEXT_USER); PENDING_CAPA_CLOSURE sampai finding wajib-CAPA CLOSED", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const ctxLead = { tenantId: t.fixture.tenantId, userId: t.leadAuditor.id };

      const audit = await tenantContextStorage.run(ctx, () =>
        auditService.createAdHoc({
          siteId: t.siteId,
          auditTypeId: t.auditTypeId,
          auditChecklistId: t.auditChecklistId,
          leadAuditorId: t.leadAuditor.id,
          plannedStartDate: new Date(),
          plannedEndDate: new Date(),
        }),
      );
      await tenantContextStorage.run(ctx, () => auditService.start(audit.id));
      const finding = await tenantContextStorage.run(ctx, () =>
        findingService.create({ auditId: audit.id, findingNumber: "F01", classification: "MAJOR_NC", description: "Temuan Major" }),
      );

      const report = await tenantContextStorage.run(ctx, () => reportService.create(audit.id));
      expect(report.totalMajorNc).toBe(1);
      const auditAfterDraft = await adminPrisma.audit.findUniqueOrThrow({ where: { id: audit.id } });
      expect(auditAfterDraft.status).toBe("REPORT_DRAFTED");

      const submitted = await tenantContextStorage.run(ctx, () => reportService.submitForApproval(report.id));
      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task1.assignedTo).toBe(t.leadAuditor.id);
      await tenantContextStorage.run(ctxLead, () => workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, t.leadAuditor.id));
      const task2 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task2.assignedTo).toBe(t.hseManager.id);
      await tenantContextStorage.run(ctx, () => workflowEngineService.actOnTask(task2.id, "APPROVE", undefined, t.hseManager.id));
      await new Promise((r) => setTimeout(r, 300));

      const reportAfter = await adminPrisma.auditReport.findUniqueOrThrow({ where: { id: report.id } });
      expect(reportAfter.approvedAt).not.toBeNull();
      expect(reportAfter.approvedBy).toBeNull();

      const auditAfterApproval = await adminPrisma.audit.findUniqueOrThrow({ where: { id: audit.id } });
      expect(auditAfterApproval.status).toBe("PENDING_CAPA_CLOSURE");
      expect(auditAfterApproval.workflowInstanceId).toBe(reportAfter.workflowInstanceId);

      await expect(tenantContextStorage.run(ctx, () => auditService.close(audit.id))).rejects.toThrow(/BR-02\/BR-03/);

      // Task 4.2 — CAPA sekarang genuinely ada: AuditFindingCapaTriggerListener
      // (konsumen audit.finding_capa_required) sudah men-CAPA_LINKED-kan
      // finding ini secara OTOMATIS jauh sebelum baris ini (event ter-emit
      // saat findingService.create() di atas, banyak await+sleep 300ms
      // sejak itu) — TIDAK perlu linkCapaRegister() manual lagi (dulu
      // workaround krn Modul 10 belum ada, sekarang self-transition
      // CAPA_LINKED->CAPA_LINKED akan ditolak kalau tetap dipanggil).
      const findingAfterAutoLink = await adminPrisma.auditFinding.findUniqueOrThrow({ where: { id: finding.id } });
      expect(findingAfterAutoLink.status).toBe("CAPA_LINKED");
      expect(findingAfterAutoLink.capaRegisterId).not.toBeNull();

      await tenantContextStorage.run(ctx, () => findingService.verify(finding.id));
      await tenantContextStorage.run(ctx, () => findingService.close(finding.id));

      const closedAudit = await tenantContextStorage.run(ctx, () => auditService.close(audit.id));
      expect(closedAudit.status).toBe("CLOSED");
    }, 20000);
  });

  describe("Scan jobs", () => {
    it("auditor-competency-expiry-scan: ACTIVE lewat expiry -> EXPIRED + notifikasi", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const record = await tenantContextStorage.run(ctx, () =>
        competencyService.create({
          userId: t.leadAuditor.id,
          competencyType: "LEAD_AUDITOR_CERT",
          standardScope: t.standardCode,
          issuedDate: new Date("2020-01-01"),
          expiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        }),
      );

      await competencyExpiryScanService.scan();

      const recordAfter = await adminPrisma.auditorCompetencyRecord.findUniqueOrThrow({ where: { id: record.id } });
      expect(recordAfter.status).toBe("EXPIRED");
      const notifs = await adminPrisma.notification.findMany({ where: { entityId: record.id, eventType: "AUDITOR_COMPETENCY_EXPIRED" } });
      expect(notifs.map((n) => n.recipientUserId)).toContain(t.leadAuditor.id);
    }, 20000);

    it("audit-finding-closure-due-scan: finding dalam jendela 7 hari -> notifikasi Lead Auditor + HSE Manager", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.hseManager.id };
      const audit = await tenantContextStorage.run(ctx, () =>
        auditService.createAdHoc({
          siteId: t.siteId,
          auditTypeId: t.auditTypeId,
          auditChecklistId: t.auditChecklistId,
          leadAuditorId: t.leadAuditor.id,
          plannedStartDate: new Date(),
          plannedEndDate: new Date(),
        }),
      );
      const finding = await tenantContextStorage.run(ctx, () =>
        findingService.create({ auditId: audit.id, findingNumber: "F03", classification: "MAJOR_NC", description: "Mendekati tenggat" }),
      );
      await adminPrisma.auditFinding.update({
        where: { id: finding.id },
        data: { targetClosureDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      });

      await findingClosureDueScanService.scan();

      const notifs = await adminPrisma.notification.findMany({ where: { entityId: finding.id, eventType: "AUDIT_FINDING_CLOSURE_DUE" } });
      const recipients = notifs.map((n) => n.recipientUserId);
      expect(recipients).toContain(t.leadAuditor.id);
      expect(recipients).toContain(t.hseManager.id);
    }, 20000);
  });

  describe("Isolasi tenant (RLS)", () => {
    it("audits/audit_findings tenant A tidak terlihat dari context tenant B", async () => {
      const tenantA = await setupTenant();
      const tenantB = await seedTenantFixture();
      const ctxA = { tenantId: tenantA.fixture.tenantId, userId: tenantA.hseManager.id };

      const audit = await tenantContextStorage.run(ctxA, () =>
        auditService.createAdHoc({
          siteId: tenantA.siteId,
          auditTypeId: tenantA.auditTypeId,
          auditChecklistId: tenantA.auditChecklistId,
          leadAuditorId: tenantA.leadAuditor.id,
          plannedStartDate: new Date(),
          plannedEndDate: new Date(),
        }),
      );
      const finding = await tenantContextStorage.run(ctxA, () =>
        findingService.create({ auditId: audit.id, findingNumber: "F04", classification: "OBSERVATION", description: "Rahasia Tenant A" }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => auditService.getById(audit.id)),
      ).rejects.toThrow();
      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => findingService.getById(finding.id)),
      ).rejects.toThrow();
    });
  });
});
