import { INestApplication } from "@nestjs/common";
import { seedIncidentNotificationTemplates } from "../../prisma/seed-incident-notification-templates";
import { CapaRegisterService } from "../../src/modules/domains/capa/capa-register.service";
import { IncidentCorrectiveActionLinkService } from "../../src/modules/domains/incident/incident-corrective-action-link.service";
import { IncidentInvestigationService } from "../../src/modules/domains/incident/incident-investigation.service";
import { IncidentRegulatoryReportOverdueScanService } from "../../src/modules/domains/incident/incident-regulatory-report-overdue-scan.service";
import { IncidentRegulatoryReportService } from "../../src/modules/domains/incident/incident-regulatory-report.service";
import { IncidentReportService } from "../../src/modules/domains/incident/incident-report.service";
import { IncidentStatisticsCacheService } from "../../src/modules/domains/incident/incident-statistics-cache.service";
import { IncidentStatisticsRecalcScanService } from "../../src/modules/domains/incident/incident-statistics-recalc-scan.service";
import { IncidentWitnessStatementService } from "../../src/modules/domains/incident/incident-witness-statement.service";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

/**
 * Task 3.5 (Modul 07 Incident Management) — cakupan: **E2E-2** (lapor ->
 * investigasi -> temuan siap, penutupan via CAPA di Phase 4 jadi tautan
 * CAPA diuji sbg link-only bukan siklus penuh), BR-01 (investigasi APPROVED
 * wajib utk FATALITY/LTI/PSE sebelum CLOSED), BR-03 (auto-create
 * regulatory report), BR-09 (gate CLOSED oleh regulatory report PENDING/
 * OVERDUE), KEEMPAT JSON Logic conditional workflow (investigasi,
 * hasRegulatoryReport), numbering scope_level=SITE, statistics cache
 * (BR-06) + scan job, regulatory-report-overdue-scan, isolasi tenant RLS.
 */
describe("Incident Management — Modul 07 (task 3.5)", () => {
  let app: INestApplication;
  let reportService: IncidentReportService;
  let investigationService: IncidentInvestigationService;
  let correctiveActionLinkService: IncidentCorrectiveActionLinkService;
  let capaRegisterService: CapaRegisterService;
  let witnessStatementService: IncidentWitnessStatementService;
  let regulatoryReportService: IncidentRegulatoryReportService;
  let statisticsCacheService: IncidentStatisticsCacheService;
  let regulatoryReportOverdueScanService: IncidentRegulatoryReportOverdueScanService;
  let statisticsRecalcScanService: IncidentStatisticsRecalcScanService;
  let workflowEngineService: WorkflowEngineService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    reportService = app.get(IncidentReportService);
    investigationService = app.get(IncidentInvestigationService);
    correctiveActionLinkService = app.get(IncidentCorrectiveActionLinkService);
    capaRegisterService = app.get(CapaRegisterService);
    witnessStatementService = app.get(IncidentWitnessStatementService);
    regulatoryReportService = app.get(IncidentRegulatoryReportService);
    statisticsCacheService = app.get(IncidentStatisticsCacheService);
    regulatoryReportOverdueScanService = app.get(IncidentRegulatoryReportOverdueScanService);
    statisticsRecalcScanService = app.get(IncidentStatisticsRecalcScanService);
    workflowEngineService = app.get(WorkflowEngineService);
    await seedIncidentNotificationTemplates(adminPrisma);
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
    const { companyId, siteId } = await seedSite(fixture.tenantId, fixture.userId);
    return { fixture, hseManager, hseOfficer, companyId, siteId };
  }

  async function pendingTaskFor(instanceId: string) {
    return adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId, status: "PENDING" } });
  }

  describe("E2E-2 — lapor -> investigasi -> temuan siap (klasifikasi wajib lapor+investigasi FATALITY)", () => {
    it("alur penuh: create->classify->investigation->team->root cause->corrective action link->witness->submit (2-stage BR-03)->approve x2->PENDING_REGULATORY_REPORT->submit regulator->CLOSED", async () => {
      const { fixture, hseManager, hseOfficer, siteId } = await setupTenant();

      const report = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        reportService.create({
          siteId,
          initialClassification: "FATALITY",
          incidentDatetime: new Date(),
          description: "Pekerja terjatuh dari ketinggian",
          reportedBy: fixture.userId,
        }),
      );
      expect(report.status).toBe("REPORTED");
      expect(report.incidentNumber).toContain("INC");
      expect(report.severityLevel).toBe("CRITICAL");

      const classified = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        reportService.classify(report.id, "FATALITY"),
      );
      expect(classified.status).toBe("UNDER_VERIFICATION");

      const investigation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        investigationService.create({
          incidentReportId: report.id,
          method: "FIVE_WHY",
          leadInvestigatorId: hseOfficer.id,
          startedAt: new Date(),
          targetCompletionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        }),
      );
      expect(investigation.status).toBe("IN_PROGRESS");
      const reportUnderInvestigation = await adminPrisma.incidentReport.findUniqueOrThrow({ where: { id: report.id } });
      expect(reportUnderInvestigation.status).toBe("UNDER_INVESTIGATION");

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        investigationService.assignTeam(investigation.id, hseOfficer.id, "LEAD"),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        investigationService.recordRootCause(investigation.id, {
          causeType: "IMMEDIATE_CAUSE",
          category: "PEOPLE",
          description: "Tidak memakai body harness",
          sequenceNo: 1,
        }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        investigationService.recordRootCause(investigation.id, {
          causeType: "ROOT_CAUSE",
          category: "MANAGEMENT_SYSTEM",
          description: "Prosedur bekerja di ketinggian tidak ditegakkan konsisten",
          methodReference: "5-Why langkah 3",
          sequenceNo: 3,
        }),
      );

      // Task 4.2 — capa_register genuinely ada sekarang, incident_corrective_actions.
      // capa_register_id sudah FK real (bukan bare UUID lagi) — baris CAPA
      // sungguhan dibuat di sini murni utk memenuhi FK constraint tsb (tautan
      // link-only, lihat banner comment file ini soal siklus CAPA penuh ada
      // di test/capa/*, bukan di sini).
      const capa = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        capaRegisterService.create({
          sourceType: "INCIDENT",
          sourceId: report.id,
          category: "CORRECTIVE",
          priority: "HIGH",
          title: `Tindak lanjut insiden ${report.incidentNumber}`,
          problemStatement: "Pekerja terjatuh dari ketinggian",
          siteId,
        }),
      );

      const link = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        correctiveActionLinkService.link({
          incidentReportId: report.id,
          incidentInvestigationId: investigation.id,
          capaRegisterId: capa.id,
        }),
      );
      expect(link.capaRegisterId).toBe(capa.id);

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        witnessStatementService.record({
          incidentReportId: report.id,
          witnessUserId: fixture.userId,
          statementText: "Saya melihat korban terjatuh dari scaffolding lantai 3",
          statementDatetime: new Date(),
        }),
      );

      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        investigationService.submitForApproval(investigation.id),
      );
      expect(submitted.status).toBe("PENDING_REVIEW");
      expect(submitted.workflowInstanceId).not.toBeNull();

      const regulatoryReportsMid = await adminPrisma.incidentRegulatoryReport.findMany({ where: { incidentReportId: report.id } });
      expect(regulatoryReportsMid).toHaveLength(1);
      expect(regulatoryReportsMid[0].status).toBe("PENDING");
      expect(regulatoryReportsMid[0].regulatoryBody).toBe("KEMNAKER");

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task1.assignedTo).toBe(hseManager.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, hseManager.id),
      );

      const instanceMid = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instanceMid.status).toBe("IN_PROGRESS");
      const task2 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task2.assignedTo).toBe(hseManager.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        workflowEngineService.actOnTask(task2.id, "APPROVE", undefined, hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const investigationApproved = await adminPrisma.incidentInvestigation.findUniqueOrThrow({ where: { id: investigation.id } });
      expect(investigationApproved.status).toBe("APPROVED");
      const reportPendingRegReport = await adminPrisma.incidentReport.findUniqueOrThrow({ where: { id: report.id } });
      expect(reportPendingRegReport.status).toBe("PENDING_REGULATORY_REPORT");

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () => reportService.close(report.id)),
      ).rejects.toThrow(/BR-09/);

      const regReport = regulatoryReportsMid[0];
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        regulatoryReportService.submit(regReport.id, "REF-2026-00123"),
      );

      const closed = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () => reportService.close(report.id));
      expect(closed.status).toBe("CLOSED");
    }, 20000);
  });

  describe("Extension kondisional hasRegulatoryReport (JSON Logic KEEMPAT di codebase) — jalur 1-stage", () => {
    it("NEAR_MISS (TIDAK memicu BR-03) -> investigasi 1-stage, terminal langsung setelah Stage 1", async () => {
      const { fixture, hseManager, hseOfficer, siteId } = await setupTenant();
      const report = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        reportService.create({ siteId, initialClassification: "NEAR_MISS", incidentDatetime: new Date(), description: "Nyaris tertimpa material", reportedBy: fixture.userId }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () => reportService.classify(report.id, "NEAR_MISS"));
      const investigation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        investigationService.create({
          incidentReportId: report.id,
          method: "FISHBONE",
          leadInvestigatorId: hseOfficer.id,
          startedAt: new Date(),
          targetCompletionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        investigationService.submitForApproval(investigation.id),
      );

      const regulatoryReports = await adminPrisma.incidentRegulatoryReport.findMany({ where: { incidentReportId: report.id } });
      expect(regulatoryReports).toHaveLength(0);

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const instance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instance.status).toBe("APPROVED");
      const allTasks = await adminPrisma.workflowTask.findMany({ where: { instanceId: instance.id } });
      expect(allTasks).toHaveLength(1);

      const reportAfter = await adminPrisma.incidentReport.findUniqueOrThrow({ where: { id: report.id } });
      expect(reportAfter.status).toBe("INVESTIGATION_COMPLETED");

      const closed = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () => reportService.close(report.id));
      expect(closed.status).toBe("CLOSED");
    }, 20000);
  });

  describe("BR-01 — investigasi APPROVED wajib sebelum CLOSED (FATALITY/LTI/PSE)", () => {
    it("close() langsung dari UNDER_VERIFICATION (investigasi TIDAK PERNAH dibuat) ditolak BR-01 utk LOST_TIME_INJURY", async () => {
      const { fixture, hseOfficer, siteId } = await setupTenant();
      const report = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        reportService.create({ siteId, initialClassification: "LOST_TIME_INJURY", incidentDatetime: new Date(), description: "Uji BR-01", reportedBy: fixture.userId }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () => reportService.classify(report.id, "LOST_TIME_INJURY"));

      // Status sekarang UNDER_VERIFICATION (structurally CLOSED-eligible per
      // ALLOWED_TRANSITIONS, jalur pintas insiden TANPA investigasi formal)
      // — SATU-SATUNYA state dimana BR-01 genuinely diuji utk klasifikasi
      // wajib investigasi TANPA investigasi baris apa pun (latestInvestigation
      // null). Begitu investigasi DIBUAT, incident_reports.status pindah ke
      // UNDER_INVESTIGATION yang TIDAK ADA jalur langsung ke CLOSED sama
      // sekali (guard struktural terpisah, redundan-tapi-aman dgn BR-01).
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () => reportService.close(report.id)),
      ).rejects.toThrow(/BR-01/);
    }, 15000);

    it("close() ditolak (guard struktural) selama status UNDER_INVESTIGATION — investigasi ada tapi belum APPROVED", async () => {
      const { fixture, hseOfficer, siteId } = await setupTenant();
      const report = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        reportService.create({ siteId, initialClassification: "LOST_TIME_INJURY", incidentDatetime: new Date(), description: "Uji BR-01 jalur investigasi", reportedBy: fixture.userId }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () => reportService.classify(report.id, "LOST_TIME_INJURY"));
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        investigationService.create({
          incidentReportId: report.id,
          method: "BOWTIE",
          leadInvestigatorId: hseOfficer.id,
          startedAt: new Date(),
          targetCompletionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () => reportService.close(report.id)),
      ).rejects.toThrow();
    }, 15000);
  });

  describe("Investigasi REJECTED -> RETURNED (bukan terminal 'REJECTED', enum tidak py nilai itu)", () => {
    it("reject Stage 1 -> investigation.status=RETURNED, incident_reports TETAP UNDER_INVESTIGATION", async () => {
      const { fixture, hseManager, hseOfficer, siteId } = await setupTenant();
      const report = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        reportService.create({ siteId, initialClassification: "NEAR_MISS", incidentDatetime: new Date(), description: "Uji reject", reportedBy: fixture.userId }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () => reportService.classify(report.id, "NEAR_MISS"));
      const investigation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        investigationService.create({
          incidentReportId: report.id,
          method: "FIVE_WHY",
          leadInvestigatorId: hseOfficer.id,
          startedAt: new Date(),
          targetCompletionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        investigationService.submitForApproval(investigation.id),
      );
      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        workflowEngineService.actOnTask(task1.id, "REJECT", "Analisis kurang mendalam", hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const investigationAfter = await adminPrisma.incidentInvestigation.findUniqueOrThrow({ where: { id: investigation.id } });
      expect(investigationAfter.status).toBe("RETURNED");
      const reportAfter = await adminPrisma.incidentReport.findUniqueOrThrow({ where: { id: report.id } });
      expect(reportAfter.status).toBe("UNDER_INVESTIGATION");
    }, 15000);
  });

  describe("Numbering scope_level=SITE", () => {
    it("2 report di site sama -> sequence 0001/0002", async () => {
      const { fixture, siteId } = await setupTenant();
      const report1 = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        reportService.create({ siteId, initialClassification: "NEAR_MISS", incidentDatetime: new Date(), description: "Uji numbering 1", reportedBy: fixture.userId }),
      );
      const report2 = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        reportService.create({ siteId, initialClassification: "NEAR_MISS", incidentDatetime: new Date(), description: "Uji numbering 2", reportedBy: fixture.userId }),
      );
      expect(report1.incidentNumber).toMatch(/0001$/);
      expect(report2.incidentNumber).toMatch(/0002$/);
    });
  });

  describe("incident-regulatory-report-overdue-scan (BR-09 bagian scan)", () => {
    it("required_by_date terlewat -> status PENDING->OVERDUE", async () => {
      const { fixture, hseOfficer, siteId } = await setupTenant();
      const pastIncidentDatetime = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const report = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        reportService.create({ siteId, initialClassification: "FATALITY", incidentDatetime: pastIncidentDatetime, description: "Uji overdue scan", reportedBy: fixture.userId }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () => reportService.classify(report.id, "FATALITY"));
      const investigation = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () =>
        investigationService.create({
          incidentReportId: report.id,
          method: "FIVE_WHY",
          leadInvestigatorId: hseOfficer.id,
          startedAt: new Date(),
          targetCompletionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseOfficer.id }, () => investigationService.submitForApproval(investigation.id));

      const regReport = await adminPrisma.incidentRegulatoryReport.findFirstOrThrow({ where: { incidentReportId: report.id } });
      expect(regReport.status).toBe("PENDING");
      expect(regReport.requiredByDate.getTime()).toBeLessThan(Date.now());

      await regulatoryReportOverdueScanService.scan();
      const regReportAfter = await adminPrisma.incidentRegulatoryReport.findUniqueOrThrow({ where: { id: regReport.id } });
      expect(regReportAfter.status).toBe("OVERDUE");
    }, 15000);
  });

  describe("IncidentStatisticsCacheService (BR-06) + incident-statistics-recalc-scan", () => {
    it("recalculate() menghitung count+rate benar; scan job merefresh pakai manhours tersimpan", async () => {
      const { fixture, siteId } = await setupTenant();
      const periodStart = new Date("2026-07-01T00:00:00.000Z");
      const periodEnd = new Date("2026-07-31T23:59:59.999Z");
      const incidentDatetime = new Date("2026-07-15T08:00:00.000Z");

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        reportService.create({ siteId, initialClassification: "LOST_TIME_INJURY", incidentDatetime, description: "Uji statistik 1", reportedBy: fixture.userId, daysLost: 10 }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        reportService.create({ siteId, initialClassification: "NEAR_MISS", incidentDatetime, description: "Uji statistik 2", reportedBy: fixture.userId }),
      );

      const cache = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        statisticsCacheService.recalculate({
          siteId,
          periodType: "MONTHLY",
          periodStartDate: periodStart,
          periodEndDate: periodEnd,
          totalManhoursWorked: 500_000,
          rateBaseHoursUsed: 1_000_000,
        }),
      );
      expect(cache.ltiCount).toBe(1);
      expect(cache.nearMissCount).toBe(1);
      expect(cache.totalDaysLost).toBe(10);
      expect(Number(cache.ltifr)).toBeCloseTo((1 * 1_000_000) / 500_000);

      // Insiden BARU di periode yang sama -> scan job harian harus menangkapnya
      // memakai manhours YANG SAMA tersimpan di baris cache (bukan input baru).
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        reportService.create({ siteId, initialClassification: "LOST_TIME_INJURY", incidentDatetime, description: "Uji statistik 3 (setelah kalkulasi pertama)", reportedBy: fixture.userId, daysLost: 5 }),
      );
      await statisticsRecalcScanService.scan();

      const cacheAfter = await adminPrisma.incidentStatisticsCache.findUniqueOrThrow({ where: { id: cache.id } });
      expect(cacheAfter.ltiCount).toBe(2);
      expect(cacheAfter.totalDaysLost).toBe(15);
      expect(Number(cacheAfter.totalManhoursWorked)).toBe(500_000); // manhours TIDAK berubah, dipakai ulang
      expect(Number(cacheAfter.ltifr)).toBeCloseTo((2 * 1_000_000) / 500_000);
    }, 15000);
  });

  describe("Isolasi tenant (RLS)", () => {
    it("incident_reports/incident_investigations tenant A tidak terlihat dari context tenant B", async () => {
      const tenantA = await setupTenant();
      const tenantB = await seedTenantFixture();

      const report = await tenantContextStorage.run({ tenantId: tenantA.fixture.tenantId, userId: tenantA.fixture.userId }, () =>
        reportService.create({ siteId: tenantA.siteId, initialClassification: "NEAR_MISS", incidentDatetime: new Date(), description: "Rahasia tenant A", reportedBy: tenantA.fixture.userId }),
      );
      await tenantContextStorage.run({ tenantId: tenantA.fixture.tenantId, userId: tenantA.hseOfficer.id }, () => reportService.classify(report.id, "NEAR_MISS"));
      const investigation = await tenantContextStorage.run({ tenantId: tenantA.fixture.tenantId, userId: tenantA.hseOfficer.id }, () =>
        investigationService.create({
          incidentReportId: report.id,
          method: "FIVE_WHY",
          leadInvestigatorId: tenantA.hseOfficer.id,
          startedAt: new Date(),
          targetCompletionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => reportService.getById(report.id)),
      ).rejects.toThrow();
      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => investigationService.getById(investigation.id)),
      ).rejects.toThrow();
    }, 15000);
  });
});
