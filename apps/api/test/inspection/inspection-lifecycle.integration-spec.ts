import { INestApplication } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { seedInspectionNotificationTemplates } from "../../prisma/seed-inspection-notification-templates";
import {
  INSPECTION_FINDING_CREATED_EVENT,
  InspectionFindingCreatedEvent,
  InspectionFindingService,
} from "../../src/modules/domains/inspection/inspection-finding.service";
import { InspectionFindingSlaScanService } from "../../src/modules/domains/inspection/inspection-finding-sla-scan.service";
import { InspectionChecklistTemplateService } from "../../src/modules/domains/inspection/inspection-checklist-template.service";
import { InspectionRecordGenerationScanService } from "../../src/modules/domains/inspection/inspection-record-generation-scan.service";
import { InspectionRecordOverdueScanService } from "../../src/modules/domains/inspection/inspection-record-overdue-scan.service";
import { InspectionRecordService } from "../../src/modules/domains/inspection/inspection-record.service";
import { InspectionScheduleService } from "../../src/modules/domains/inspection/inspection-schedule.service";
import { InspectionScoreService } from "../../src/modules/domains/inspection/inspection-score.service";
import { InspectionTypeService } from "../../src/modules/domains/inspection/inspection-type.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import {
  adminPrisma,
  assignRole,
  createTestApp,
  flushTestRedis,
  seedCleanAttachment,
  seedSite,
  seedTenantFixture,
  seedUserInTenant,
} from "./test-helpers";

/**
 * Task 3.6 (Modul 08 Inspection Management) — cakupan: lifecycle ad-hoc
 * penuh (type->template v1->record->submit item->BR-01 mandatory gate->
 * BR-02 foto-jika-FAIL gate->complete BR-03 skor), InspectionFindingService
 * (event stub inspection.finding_created, TIDAK ada listener nyata di
 * codebase ini), InspectionScoreService (breakdown manual per kategori),
 * BR-07 versioning (record historis TIDAK berubah), 3 scan job
 * (inspection-record-generation-scan termasuk skip CUSTOM_CRON + skip
 * tanpa default inspector, inspection-record-overdue-scan BR-06 +
 * notifikasi, inspection-finding-sla-scan BR-04 + notifikasi), numbering
 * scope_level=SITE reset_period=MONTHLY SEQ:5, isolasi tenant RLS. Modul
 * ini SATU-SATUNYA domain module TANPA Workflow Engine (PRD §4 poin 9) —
 * TIDAK ADA workflowInstanceId/pendingTask di alur manapun di sini.
 */
describe("Inspection Management — Modul 08 (task 3.6)", () => {
  let app: INestApplication;
  let typeService: InspectionTypeService;
  let templateService: InspectionChecklistTemplateService;
  let scheduleService: InspectionScheduleService;
  let recordService: InspectionRecordService;
  let findingService: InspectionFindingService;
  let scoreService: InspectionScoreService;
  let generationScanService: InspectionRecordGenerationScanService;
  let overdueScanService: InspectionRecordOverdueScanService;
  let findingSlaScanService: InspectionFindingSlaScanService;
  let eventEmitter: EventEmitter2;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    typeService = app.get(InspectionTypeService);
    templateService = app.get(InspectionChecklistTemplateService);
    scheduleService = app.get(InspectionScheduleService);
    recordService = app.get(InspectionRecordService);
    findingService = app.get(InspectionFindingService);
    scoreService = app.get(InspectionScoreService);
    generationScanService = app.get(InspectionRecordGenerationScanService);
    overdueScanService = app.get(InspectionRecordOverdueScanService);
    findingSlaScanService = app.get(InspectionFindingSlaScanService);
    eventEmitter = app.get(EventEmitter2);
    await seedInspectionNotificationTemplates(adminPrisma);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function setupTenant() {
    const fixture = await seedTenantFixture();
    const tenantAdmin = await seedUserInTenant(fixture.tenantId, "Tenant Admin");
    await assignRole(fixture.tenantId, tenantAdmin.id, "TENANT_ADMIN");
    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    const inspector = await seedUserInTenant(fixture.tenantId, "Inspector");
    await assignRole(fixture.tenantId, inspector.id, "HSE_OFFICER");
    const { siteId } = await seedSite(fixture.tenantId, fixture.userId);
    return { fixture, tenantAdmin, hseManager, inspector, siteId };
  }

  describe("Lifecycle ad-hoc: type->template(v1)->record->BR-01->BR-02->complete (BR-03) + numbering SITE/SEQ:5", () => {
    it("gate BR-01 (mandatory) lalu BR-02 (foto wajib jika FAIL) ditegakkan sebelum COMPLETED; overall_score/result terhitung", async () => {
      const { fixture, tenantAdmin, inspector, siteId } = await setupTenant();
      const ctxAdmin = { tenantId: fixture.tenantId, userId: tenantAdmin.id };
      const ctxInspector = { tenantId: fixture.tenantId, userId: inspector.id };

      const type = await tenantContextStorage.run(ctxAdmin, () => typeService.create({ code: "APAR", name: "Inspeksi APAR" }));

      const template = await tenantContextStorage.run(ctxAdmin, () =>
        templateService.create({
          inspectionTypeId: type.id,
          name: "Checklist APAR v1",
          scoringMethod: "WEIGHTED_SCORE",
          passingScoreThreshold: 50,
          effectiveDate: new Date(),
          items: [
            { sequenceNo: 1, itemText: "Tekanan APAR normal", responseType: "PASS_FAIL", weight: 2, isMandatory: true, requiresPhotoIfFail: true },
            { sequenceNo: 2, itemText: "Segel belum rusak", responseType: "YES_NO", weight: 1, isMandatory: true },
            { sequenceNo: 3, itemText: "Kondisi umum (1-5)", responseType: "SCALE_1_5", weight: 1, isMandatory: false },
          ],
        }),
      );
      expect(template.version).toBe(1);

      const items = await tenantContextStorage.run(ctxAdmin, () => templateService.listItemsByTemplate(template.id));
      const itemA = items.find((i) => i.sequenceNo === 1)!;
      const itemB = items.find((i) => i.sequenceNo === 2)!;

      const record = await tenantContextStorage.run(ctxInspector, () =>
        recordService.create({ inspectionChecklistTemplateId: template.id, siteId, plannedDate: new Date(), inspectorId: inspector.id }),
      );
      expect(record.status).toBe("SCHEDULED");
      expect(record.inspectionRecordNumber).toContain("INS");
      expect(record.inspectionRecordNumber).toMatch(/00001$/);

      await tenantContextStorage.run(ctxInspector, () => recordService.start(record.id));
      const started = await adminPrisma.inspectionRecord.findUniqueOrThrow({ where: { id: record.id } });
      expect(started.status).toBe("IN_PROGRESS");
      expect(started.actualDate).not.toBeNull();

      await expect(tenantContextStorage.run(ctxInspector, () => recordService.complete(record.id))).rejects.toThrow(/BR-01/);

      await tenantContextStorage.run(ctxInspector, () => recordService.submitItemResponse(record.id, { templateItemId: itemB.id, responseValue: "YES" }));
      await expect(tenantContextStorage.run(ctxInspector, () => recordService.complete(record.id))).rejects.toThrow(/BR-01/);

      const recordItemA = await tenantContextStorage.run(ctxInspector, () =>
        recordService.submitItemResponse(record.id, { templateItemId: itemA.id, responseValue: "FAIL" }),
      );
      expect(Number(recordItemA.scoreObtained)).toBe(0);

      await expect(tenantContextStorage.run(ctxInspector, () => recordService.complete(record.id))).rejects.toThrow(/BR-02/);

      await seedCleanAttachment(fixture.tenantId, "inspection_record_item", recordItemA.id, inspector.id);

      const completed = await tenantContextStorage.run(ctxInspector, () => recordService.complete(record.id));
      expect(completed.status).toBe("COMPLETED");
      // scoreable: A(0,w2) + B(1,w1) -> (0+1)/(2+1)*100 = 33.33
      expect(Number(completed.overallScore)).toBeCloseTo(33.33, 1);
      expect(completed.overallResult).toBe("FAIL"); // threshold 50, score 33.33
    }, 20000);
  });

  describe("InspectionFindingService (event stub Modul 24) + InspectionScoreService (breakdown manual)", () => {
    it("create() menyimpan baris status OPEN + emit event inspection.finding_created; score breakdown per kategori", async () => {
      const { fixture, tenantAdmin, inspector, siteId } = await setupTenant();
      const ctxAdmin = { tenantId: fixture.tenantId, userId: tenantAdmin.id };
      const ctxInspector = { tenantId: fixture.tenantId, userId: inspector.id };

      const type = await tenantContextStorage.run(ctxAdmin, () => typeService.create({ code: "HK", name: "Housekeeping" }));
      const template = await tenantContextStorage.run(ctxAdmin, () =>
        templateService.create({
          inspectionTypeId: type.id,
          name: "Checklist HK v1",
          scoringMethod: "CHECKLIST_NO_SCORE",
          effectiveDate: new Date(),
          items: [{ sequenceNo: 1, itemText: "Area bersih", responseType: "YES_NO", isMandatory: true }],
        }),
      );
      const record = await tenantContextStorage.run(ctxInspector, () =>
        recordService.create({ inspectionChecklistTemplateId: template.id, siteId, plannedDate: new Date(), inspectorId: inspector.id }),
      );
      await tenantContextStorage.run(ctxInspector, () => recordService.start(record.id));

      let captured: InspectionFindingCreatedEvent | undefined;
      const handler = (event: InspectionFindingCreatedEvent) => {
        captured = event;
      };
      eventEmitter.on(INSPECTION_FINDING_CREATED_EVENT, handler);
      try {
        const finding = await tenantContextStorage.run(ctxInspector, () =>
          findingService.create({
            inspectionRecordId: record.id,
            title: "Tumpukan sampah di gudang",
            description: "Sampah menumpuk 3 hari, berpotensi bahaya kebakaran",
            severity: "MEDIUM",
            targetCloseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }),
        );
        expect(finding.status).toBe("OPEN");
        expect(captured).toBeDefined();
        expect(captured!.inspectionFindingId).toBe(finding.id);
        expect(captured!.inspectionRecordId).toBe(record.id);
        expect(captured!.severity).toBe("MEDIUM");
        expect(captured!.identifiedBy).toBe(inspector.id);
      } finally {
        eventEmitter.off(INSPECTION_FINDING_CREATED_EVENT, handler);
      }

      const score = await tenantContextStorage.run(ctxInspector, () =>
        scoreService.record({ inspectionRecordId: record.id, category: "APD", scoreObtained: 8, maxPossibleScore: 10 }),
      );
      expect(Number(score.percentage)).toBe(80);
      const scores = await tenantContextStorage.run(ctxInspector, () => scoreService.listByRecord(record.id));
      expect(scores).toHaveLength(1);
    }, 15000);
  });

  describe("BR-07 — createNewVersion() TIDAK mengubah record historis (snapshot FK)", () => {
    it("template v1->v2: v1 isActive=false, record LAMA tetap menunjuk v1", async () => {
      const { fixture, tenantAdmin, inspector, siteId } = await setupTenant();
      const ctxAdmin = { tenantId: fixture.tenantId, userId: tenantAdmin.id };
      const ctxInspector = { tenantId: fixture.tenantId, userId: inspector.id };

      const type = await tenantContextStorage.run(ctxAdmin, () => typeService.create({ code: "SCAFF", name: "Inspeksi Scaffolding" }));
      const template1 = await tenantContextStorage.run(ctxAdmin, () =>
        templateService.create({
          inspectionTypeId: type.id,
          name: "Checklist Scaffolding v1",
          scoringMethod: "PASS_FAIL_ONLY",
          effectiveDate: new Date(),
          items: [{ sequenceNo: 1, itemText: "Base plate terpasang", responseType: "PASS_FAIL", isMandatory: true }],
        }),
      );
      const record = await tenantContextStorage.run(ctxInspector, () =>
        recordService.create({ inspectionChecklistTemplateId: template1.id, siteId, plannedDate: new Date(), inspectorId: inspector.id }),
      );

      const template2 = await tenantContextStorage.run(ctxAdmin, () =>
        templateService.createNewVersion(type.id, {
          name: "Checklist Scaffolding v2",
          scoringMethod: "PASS_FAIL_ONLY",
          effectiveDate: new Date(),
          items: [{ sequenceNo: 1, itemText: "Base plate + tag hijau terpasang", responseType: "PASS_FAIL", isMandatory: true }],
        }),
      );
      expect(template2.version).toBe(2);
      expect(template2.isActive).toBe(true);

      const template1After = await adminPrisma.inspectionChecklistTemplate.findUniqueOrThrow({ where: { id: template1.id } });
      expect(template1After.isActive).toBe(false);

      const recordAfter = await adminPrisma.inspectionRecord.findUniqueOrThrow({ where: { id: record.id } });
      expect(recordAfter.inspectionChecklistTemplateId).toBe(template1.id);

      const resolved = await tenantContextStorage.run(ctxAdmin, () => templateService.resolveActiveTemplate(type.id));
      expect(resolved.id).toBe(template2.id);
    }, 15000);
  });

  describe("inspection-record-generation-scan (PRD §4 poin 2-3)", () => {
    it("jadwal WEEKLY due -> record baru digenerate + next_generation_date maju 7 hari", async () => {
      const { fixture, tenantAdmin, hseManager, inspector, siteId } = await setupTenant();
      const ctxAdmin = { tenantId: fixture.tenantId, userId: tenantAdmin.id };
      const ctxManager = { tenantId: fixture.tenantId, userId: hseManager.id };

      const type = await tenantContextStorage.run(ctxAdmin, () => typeService.create({ code: "PATROL", name: "Patroli Rutin" }));
      const template = await tenantContextStorage.run(ctxAdmin, () =>
        templateService.create({
          inspectionTypeId: type.id,
          name: "Checklist Patroli v1",
          scoringMethod: "CHECKLIST_NO_SCORE",
          effectiveDate: new Date(),
          items: [{ sequenceNo: 1, itemText: "Jalur evakuasi bebas hambatan", responseType: "YES_NO", isMandatory: true }],
        }),
      );

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const schedule = await tenantContextStorage.run(ctxManager, () =>
        scheduleService.create({
          inspectionChecklistTemplateId: template.id,
          siteId,
          recurrencePattern: "WEEKLY",
          defaultAssignedInspectorId: inspector.id,
          nextGenerationDate: yesterday,
        }),
      );

      await generationScanService.scan();

      const records = await adminPrisma.inspectionRecord.findMany({ where: { inspectionScheduleId: schedule.id } });
      expect(records).toHaveLength(1);
      expect(records[0].inspectorId).toBe(inspector.id);
      expect(records[0].createdBy).toBe(hseManager.id); // aktor = createdBy BARIS JADWAL, bukan admin generik

      const scheduleAfter = await adminPrisma.inspectionSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
      expect(scheduleAfter.nextGenerationDate.getTime()).toBe(schedule.nextGenerationDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }, 15000);

    it("jadwal CUSTOM_CRON due -> DILEWATI SELURUHNYA (record TIDAK dibuat, next_generation_date TIDAK maju)", async () => {
      const { fixture, tenantAdmin, hseManager, inspector, siteId } = await setupTenant();
      const ctxAdmin = { tenantId: fixture.tenantId, userId: tenantAdmin.id };
      const ctxManager = { tenantId: fixture.tenantId, userId: hseManager.id };

      const type = await tenantContextStorage.run(ctxAdmin, () => typeService.create({ code: "CUSTOM1", name: "Jadwal Custom" }));
      const template = await tenantContextStorage.run(ctxAdmin, () =>
        templateService.create({
          inspectionTypeId: type.id,
          name: "Checklist Custom v1",
          scoringMethod: "CHECKLIST_NO_SCORE",
          effectiveDate: new Date(),
          items: [{ sequenceNo: 1, itemText: "Item custom", responseType: "YES_NO", isMandatory: true }],
        }),
      );
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const schedule = await tenantContextStorage.run(ctxManager, () =>
        scheduleService.create({
          inspectionChecklistTemplateId: template.id,
          siteId,
          recurrencePattern: "CUSTOM_CRON",
          recurrenceDetail: "0 6 * * 1",
          defaultAssignedInspectorId: inspector.id,
          nextGenerationDate: yesterday,
        }),
      );

      await generationScanService.scan();

      const records = await adminPrisma.inspectionRecord.findMany({ where: { inspectionScheduleId: schedule.id } });
      expect(records).toHaveLength(0);
      const scheduleAfter = await adminPrisma.inspectionSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
      expect(scheduleAfter.nextGenerationDate.getTime()).toBe(schedule.nextGenerationDate.getTime());
    }, 15000);

    it("jadwal TANPA default_assigned_inspector_id -> DILEWATI (inspector_id NOT NULL tidak bisa auto)", async () => {
      const { fixture, tenantAdmin, hseManager, siteId } = await setupTenant();
      const ctxAdmin = { tenantId: fixture.tenantId, userId: tenantAdmin.id };
      const ctxManager = { tenantId: fixture.tenantId, userId: hseManager.id };

      const type = await tenantContextStorage.run(ctxAdmin, () => typeService.create({ code: "NOINSP", name: "Tanpa Inspector Default" }));
      const template = await tenantContextStorage.run(ctxAdmin, () =>
        templateService.create({
          inspectionTypeId: type.id,
          name: "Checklist v1",
          scoringMethod: "CHECKLIST_NO_SCORE",
          effectiveDate: new Date(),
          items: [{ sequenceNo: 1, itemText: "Item", responseType: "YES_NO", isMandatory: true }],
        }),
      );
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const schedule = await tenantContextStorage.run(ctxManager, () =>
        scheduleService.create({ inspectionChecklistTemplateId: template.id, siteId, recurrencePattern: "DAILY", nextGenerationDate: yesterday }),
      );

      await generationScanService.scan();

      const records = await adminPrisma.inspectionRecord.findMany({ where: { inspectionScheduleId: schedule.id } });
      expect(records).toHaveLength(0);
      const scheduleAfter = await adminPrisma.inspectionSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
      expect(scheduleAfter.nextGenerationDate.getTime()).toBe(schedule.nextGenerationDate.getTime());
    }, 15000);
  });

  describe("inspection-record-overdue-scan (BR-06, reinterpretasi level-record) + notifikasi", () => {
    it("planned_date terlewat & status SCHEDULED -> OVERDUE + notifikasi inspector & HSE Manager", async () => {
      const { fixture, tenantAdmin, hseManager, inspector, siteId } = await setupTenant();
      const ctxAdmin = { tenantId: fixture.tenantId, userId: tenantAdmin.id };
      const ctxInspector = { tenantId: fixture.tenantId, userId: inspector.id };

      const type = await tenantContextStorage.run(ctxAdmin, () => typeService.create({ code: "OVR", name: "Uji Overdue" }));
      const template = await tenantContextStorage.run(ctxAdmin, () =>
        templateService.create({
          inspectionTypeId: type.id,
          name: "Checklist v1",
          scoringMethod: "CHECKLIST_NO_SCORE",
          effectiveDate: new Date(),
          items: [{ sequenceNo: 1, itemText: "Item", responseType: "YES_NO", isMandatory: true }],
        }),
      );
      const pastPlannedDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const record = await tenantContextStorage.run(ctxInspector, () =>
        recordService.create({ inspectionChecklistTemplateId: template.id, siteId, plannedDate: pastPlannedDate, inspectorId: inspector.id }),
      );
      expect(record.status).toBe("SCHEDULED");

      await overdueScanService.scan();

      const after = await adminPrisma.inspectionRecord.findUniqueOrThrow({ where: { id: record.id } });
      expect(after.status).toBe("OVERDUE");

      const notifs = await adminPrisma.notification.findMany({ where: { entityId: record.id, eventType: "INSPECTION_RECORD_OVERDUE" } });
      const recipientIds = notifs.map((n) => n.recipientUserId).sort();
      expect(recipientIds).toEqual([inspector.id, hseManager.id].sort());
    }, 15000);
  });

  describe("inspection-finding-sla-scan (BR-04) + notifikasi eskalasi", () => {
    it("temuan HIGH tanpa action_tracking_id >24 jam -> notifikasi HSE Manager", async () => {
      const { fixture, tenantAdmin, hseManager, inspector, siteId } = await setupTenant();
      const ctxAdmin = { tenantId: fixture.tenantId, userId: tenantAdmin.id };
      const ctxInspector = { tenantId: fixture.tenantId, userId: inspector.id };

      const type = await tenantContextStorage.run(ctxAdmin, () => typeService.create({ code: "SLA", name: "Uji SLA Temuan" }));
      const template = await tenantContextStorage.run(ctxAdmin, () =>
        templateService.create({
          inspectionTypeId: type.id,
          name: "Checklist v1",
          scoringMethod: "CHECKLIST_NO_SCORE",
          effectiveDate: new Date(),
          items: [{ sequenceNo: 1, itemText: "Item", responseType: "YES_NO", isMandatory: true }],
        }),
      );
      const record = await tenantContextStorage.run(ctxInspector, () =>
        recordService.create({ inspectionChecklistTemplateId: template.id, siteId, plannedDate: new Date(), inspectorId: inspector.id }),
      );
      await tenantContextStorage.run(ctxInspector, () => recordService.start(record.id));
      const finding = await tenantContextStorage.run(ctxInspector, () =>
        findingService.create({
          inspectionRecordId: record.id,
          title: "APD tidak dipakai",
          description: "Pekerja tanpa helm di area proyek",
          severity: "HIGH",
        }),
      );
      // Backdate identified_at (>24 jam SLA) — service selalu memakai new Date() saat create().
      await adminPrisma.inspectionFinding.update({
        where: { id: finding.id },
        data: { identifiedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
      });

      await findingSlaScanService.scan();

      const notifs = await adminPrisma.notification.findMany({ where: { entityId: finding.id, eventType: "INSPECTION_FINDING_SLA_BREACH" } });
      expect(notifs.map((n) => n.recipientUserId)).toEqual([hseManager.id]);
    }, 15000);
  });

  describe("Isolasi tenant (RLS)", () => {
    it("inspection_types/inspection_records tenant A tidak terlihat dari context tenant B", async () => {
      const tenantA = await setupTenant();
      const tenantB = await seedTenantFixture();
      const ctxAdminA = { tenantId: tenantA.fixture.tenantId, userId: tenantA.tenantAdmin.id };
      const ctxInspectorA = { tenantId: tenantA.fixture.tenantId, userId: tenantA.inspector.id };

      const type = await tenantContextStorage.run(ctxAdminA, () => typeService.create({ code: "RLS", name: "Rahasia Tenant A" }));
      const template = await tenantContextStorage.run(ctxAdminA, () =>
        templateService.create({
          inspectionTypeId: type.id,
          name: "Checklist Rahasia",
          scoringMethod: "CHECKLIST_NO_SCORE",
          effectiveDate: new Date(),
          items: [{ sequenceNo: 1, itemText: "Item", responseType: "YES_NO", isMandatory: true }],
        }),
      );
      const record = await tenantContextStorage.run(ctxInspectorA, () =>
        recordService.create({ inspectionChecklistTemplateId: template.id, siteId: tenantA.siteId, plannedDate: new Date(), inspectorId: tenantA.inspector.id }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => typeService.getById(type.id)),
      ).rejects.toThrow();
      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => recordService.getById(record.id)),
      ).rejects.toThrow();
    }, 15000);
  });
});
