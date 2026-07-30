import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { seedAssetEquipmentNotificationTemplates } from "../../prisma/seed-asset-equipment-notification-templates";
import { AssetCategoryService } from "../../src/modules/domains/asset-equipment/asset-category.service";
import { AssetTransferService } from "../../src/modules/domains/asset-equipment/asset-transfer.service";
import { AssetService } from "../../src/modules/domains/asset-equipment/asset.service";
import { MaintenanceDueScanService } from "../../src/modules/domains/asset-equipment/maintenance-due-scan.service";
import { MaintenanceRecordService } from "../../src/modules/domains/asset-equipment/maintenance-record.service";
import { MaintenanceScheduleService } from "../../src/modules/domains/asset-equipment/maintenance-schedule.service";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Task 6.1 (Modul 15 Asset & Equipment Management) — cakupan: AssetCategory
 * CRUD+soft-delete, Asset create (numbering ASSET) + BR-02 (notif HANYA
 * transisi false->true) + BR-04 (alert OUT_OF_SERVICE lewat update() manual
 * MAUPUN MaintenanceRecordService — dua jalur), MaintenanceSchedule/
 * MaintenanceRecord (next_due_date recompute + reset idempotency reminder,
 * RUNNING_HOURS null), AssetTransferService (transfer/retire BR-01,
 * requestDisposal BR-03 kondisional Workflow Engine: direct vs 1-stage
 * APPROVED/REJECTED), maintenance-due-scan job (H-7 + overdue satu pass,
 * idempotency, resolusi penerima responsibleRoleId eksplisit vs fallback
 * SUPERVISOR + cc HSE_MANAGER utk overdue), isolasi tenant RLS.
 */
describe("Asset & Equipment Management — Modul 15 (task 6.1)", () => {
  let app: INestApplication;
  let categoryService: AssetCategoryService;
  let assetService: AssetService;
  let scheduleService: MaintenanceScheduleService;
  let recordService: MaintenanceRecordService;
  let transferService: AssetTransferService;
  let scanService: MaintenanceDueScanService;
  let workflowEngineService: WorkflowEngineService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    categoryService = app.get(AssetCategoryService);
    assetService = app.get(AssetService);
    scheduleService = app.get(MaintenanceScheduleService);
    recordService = app.get(MaintenanceRecordService);
    transferService = app.get(AssetTransferService);
    scanService = app.get(MaintenanceDueScanService);
    workflowEngineService = app.get(WorkflowEngineService);
    await seedAssetEquipmentNotificationTemplates(adminPrisma);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function setupTenant() {
    const fixture = await seedTenantFixture();
    const facilityOfficer = await seedUserInTenant(fixture.tenantId, "Facility Officer");
    await assignRole(fixture.tenantId, facilityOfficer.id, "SUPERVISOR");
    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    const companyAdmin = await seedUserInTenant(fixture.tenantId, "Company Admin");
    await assignRole(fixture.tenantId, companyAdmin.id, "COMPANY_ADMIN");
    const { companyId, branchId, siteId } = await seedSite(fixture.tenantId, fixture.userId);
    const site2 = await adminPrisma.site.create({
      data: {
        tenantId: fixture.tenantId,
        companyId,
        branchId,
        siteCode: `ST-${randomUUID().slice(0, 8)}`,
        name: "Fixture Site 2",
        siteType: "PERMANENT",
        createdBy: fixture.userId,
        updatedBy: fixture.userId,
      },
    });
    return { fixture, facilityOfficer, hseManager, companyAdmin, companyId, siteId, siteId2: site2.id };
  }

  async function seedCategory(
    tenantId: string,
    actorUserId: string,
    overrides: { requiresDisposalApproval?: boolean; defaultIsSafetyCritical?: boolean } = {},
  ) {
    const actorCtx = { tenantId, userId: actorUserId };
    return tenantContextStorage.run(actorCtx, () =>
      categoryService.create({
        categoryName: `Kategori ${randomUUID().slice(0, 8)}`,
        defaultIsSafetyCritical: overrides.defaultIsSafetyCritical ?? false,
        requiresDisposalApproval: overrides.requiresDisposalApproval ?? false,
      }),
    );
  }

  async function pendingTaskFor(instanceId: string) {
    return adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId, status: "PENDING" } });
  }

  async function approveTask(tenantId: string, workflowInstanceId: string, approverId: string) {
    const task = await pendingTaskFor(workflowInstanceId);
    await tenantContextStorage.run({ tenantId, userId: approverId }, () => workflowEngineService.actOnTask(task.id, "APPROVE", undefined, approverId));
    await sleep(300);
  }

  async function rejectTask(tenantId: string, workflowInstanceId: string, approverId: string) {
    const task = await pendingTaskFor(workflowInstanceId);
    await tenantContextStorage.run({ tenantId, userId: approverId }, () => workflowEngineService.actOnTask(task.id, "REJECT", undefined, approverId));
    await sleep(300);
  }

  describe("AssetCategory — CRUD + soft-delete", () => {
    it("create->update->list->softDelete (dikecualikan dari list() setelahnya)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };

      const category = await tenantContextStorage.run(actorCtx, () =>
        categoryService.create({ categoryName: "Genset & Kelistrikan", defaultIsSafetyCritical: true, requiresDisposalApproval: false }),
      );
      expect(category.defaultIsSafetyCritical).toBe(true);

      const updated = await tenantContextStorage.run(actorCtx, () => categoryService.update(category.id, { categoryName: "Genset & Kelistrikan Darurat" }));
      expect(updated.categoryName).toBe("Genset & Kelistrikan Darurat");

      const listed = await tenantContextStorage.run(actorCtx, () => categoryService.list());
      expect(listed.some((c) => c.id === category.id)).toBe(true);

      await tenantContextStorage.run(actorCtx, () => categoryService.softDelete(category.id));
      const afterDelete = await tenantContextStorage.run(actorCtx, () => categoryService.list());
      expect(afterDelete.some((c) => c.id === category.id)).toBe(false);
    });
  });

  describe("Asset — create (numbering) + BR-02 safety-critical flag", () => {
    it("create() men-generate assetCode pola AST/{SITE}/{YYYY}/{SEQ} + isSafetyCritical dari default kategori", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id, { defaultIsSafetyCritical: true });

      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Genset Darurat Blok A" }),
      );
      expect(asset.assetCode).toContain("AST");
      expect(asset.isSafetyCritical).toBe(true); // dari default kategori, bukan diinput eksplisit
      expect(asset.lifecycleStatus).toBe("ACTIVE");
      expect(asset.conditionStatus).toBe("GOOD");
    });

    it("BR-02: is_safety_critical SUDAH true SEJAK create() TIDAK memicu notifikasi (bukan transisi)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id);

      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "APAR Ruang Server", isSafetyCritical: true }),
      );
      expect(asset.isSafetyCritical).toBe(true);

      const notif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "ASSET_EQUIPMENT_SAFETY_CRITICAL_FLAGGED", entityId: asset.id },
      });
      expect(notif).toBeNull();
    });

    it("BR-02: update() false->true memicu notifikasi ke HSE Manager; update lain tidak", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id);

      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Kompresor Udara" }),
      );
      expect(asset.isSafetyCritical).toBe(false);

      const untouched = await tenantContextStorage.run(actorCtx, () => assetService.update(asset.id, { manufacturer: "Atlas Copco" }));
      expect(untouched.isSafetyCritical).toBe(false);
      const noNotifYet = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "ASSET_EQUIPMENT_SAFETY_CRITICAL_FLAGGED", entityId: asset.id },
      });
      expect(noNotifYet).toBeNull();

      const flagged = await tenantContextStorage.run(actorCtx, () => assetService.update(asset.id, { isSafetyCritical: true }));
      expect(flagged.isSafetyCritical).toBe(true);
      const notif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "ASSET_EQUIPMENT_SAFETY_CRITICAL_FLAGGED", entityId: asset.id, recipientUserId: t.hseManager.id },
      });
      expect(notif).not.toBeNull();
    });
  });

  describe("Asset — BR-04 alert OUT_OF_SERVICE aset kritis-K3 (dua jalur penulis condition_status)", () => {
    it("lewat AssetService.update() manual (conditionStatus langsung, gap ditemukan+diperbaiki saat task 279)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id, { defaultIsSafetyCritical: true });
      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "APAR Gudang B3" }),
      );

      await tenantContextStorage.run(actorCtx, () => assetService.update(asset.id, { conditionStatus: "OUT_OF_SERVICE" }));

      const notif = await adminPrisma.notification.findFirst({
        where: {
          tenantId: t.fixture.tenantId,
          eventType: "ASSET_EQUIPMENT_SAFETY_CRITICAL_OUT_OF_SERVICE",
          entityId: asset.id,
          recipientUserId: t.hseManager.id,
        },
      });
      expect(notif).not.toBeNull();
      expect(notif!.priority).toBe("HIGH");
    });

    it("TIDAK memicu alert kalau aset bukan safety-critical", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id);
      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Meja Kerja" }),
      );

      await tenantContextStorage.run(actorCtx, () => assetService.update(asset.id, { conditionStatus: "OUT_OF_SERVICE" }));

      const notif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "ASSET_EQUIPMENT_SAFETY_CRITICAL_OUT_OF_SERVICE", entityId: asset.id },
      });
      expect(notif).toBeNull();
    });

    it("lewat MaintenanceRecordService.create() — result_condition menulis assets.condition_status + alert", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id, { defaultIsSafetyCritical: true });
      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Forklift Gudang" }),
      );

      await tenantContextStorage.run(actorCtx, () =>
        recordService.create({ assetId: asset.id, performedDate: new Date(), performedBy: t.facilityOfficer.id, resultCondition: "OUT_OF_SERVICE" }),
      );

      const afterRecord = await adminPrisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
      expect(afterRecord.conditionStatus).toBe("OUT_OF_SERVICE");

      const notif = await adminPrisma.notification.findFirst({
        where: {
          tenantId: t.fixture.tenantId,
          eventType: "ASSET_EQUIPMENT_SAFETY_CRITICAL_OUT_OF_SERVICE",
          entityId: asset.id,
          recipientUserId: t.hseManager.id,
        },
      });
      expect(notif).not.toBeNull();
    });
  });

  describe("MaintenanceSchedule + MaintenanceRecord — recompute next_due_date + reset idempotency", () => {
    it("record dgn maintenanceScheduleId: next_due_date maju + reminder columns direset null", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id);
      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Pompa Hydrant" }),
      );

      const firstDue = new Date();
      firstDue.setDate(firstDue.getDate() - 2);
      const schedule = await tenantContextStorage.run(actorCtx, () =>
        scheduleService.create({ assetId: asset.id, maintenanceType: "Preventive — pelumasan", intervalType: "MONTHS", intervalValue: 3, nextDueDate: firstDue }),
      );

      // simulasikan idempotency flag pernah terisi dari siklus sebelumnya.
      await adminPrisma.maintenanceSchedule.update({ where: { id: schedule.id }, data: { dueSoonReminderSentAt: new Date(), overdueNotifiedAt: new Date() } });

      const performedDate = new Date();
      await tenantContextStorage.run(actorCtx, () =>
        recordService.create({
          assetId: asset.id,
          maintenanceScheduleId: schedule.id,
          performedDate,
          performedBy: t.facilityOfficer.id,
          resultCondition: "GOOD",
        }),
      );

      const afterRecord = await adminPrisma.maintenanceSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
      const expectedNextDue = new Date(performedDate);
      expectedNextDue.setUTCMonth(expectedNextDue.getUTCMonth() + 3);
      expect(afterRecord.nextDueDate.toISOString().slice(0, 10)).toBe(expectedNextDue.toISOString().slice(0, 10));
      expect(afterRecord.dueSoonReminderSentAt).toBeNull();
      expect(afterRecord.overdueNotifiedAt).toBeNull();
    });

    it("RUNNING_HOURS: next_due_date TIDAK berubah (calculateNextDueDate mengembalikan null)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id);
      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Genset Cadangan" }),
      );

      const originalDue = new Date();
      originalDue.setDate(originalDue.getDate() + 30);
      const schedule = await tenantContextStorage.run(actorCtx, () =>
        scheduleService.create({ assetId: asset.id, maintenanceType: "Service 500 jam", intervalType: "RUNNING_HOURS", intervalValue: 500, nextDueDate: originalDue }),
      );

      await tenantContextStorage.run(actorCtx, () =>
        recordService.create({ assetId: asset.id, maintenanceScheduleId: schedule.id, performedDate: new Date(), performedBy: t.facilityOfficer.id, resultCondition: "GOOD" }),
      );

      const afterRecord = await adminPrisma.maintenanceSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
      expect(afterRecord.nextDueDate.toISOString().slice(0, 10)).toBe(originalDue.toISOString().slice(0, 10));
    });

    it("MaintenanceScheduleService.update() mengubah nextDueDate manual JUGA mereset reminder columns", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id);
      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "AC Ruang Panel" }),
      );
      const schedule = await tenantContextStorage.run(actorCtx, () =>
        scheduleService.create({ assetId: asset.id, maintenanceType: "Cleaning filter", intervalType: "MONTHS", intervalValue: 1, nextDueDate: new Date() }),
      );
      await adminPrisma.maintenanceSchedule.update({ where: { id: schedule.id }, data: { dueSoonReminderSentAt: new Date() } });

      const postponed = new Date();
      postponed.setDate(postponed.getDate() + 14);
      const updated = await tenantContextStorage.run(actorCtx, () => scheduleService.update(schedule.id, { nextDueDate: postponed }));
      expect(updated.dueSoonReminderSentAt).toBeNull();
    });
  });

  describe("AssetTransferService — transfer + retire/disposal (BR-01, BR-03)", () => {
    it("transfer(): site_id berubah, log tercatat", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id);
      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Excavator Mini" }),
      );

      const log = await tenantContextStorage.run(actorCtx, () =>
        transferService.transfer({ assetId: asset.id, toSiteId: t.siteId2, transferDate: new Date(), reason: "Rotasi proyek" }),
      );
      expect(log.fromSiteId).toBe(t.siteId);
      expect(log.toSiteId).toBe(t.siteId2);

      const moved = await adminPrisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
      expect(moved.siteId).toBe(t.siteId2);
    });

    it("retire(): lifecycleStatus=RETIRED + jadwal aktif dinonaktifkan (BR-01, TIDAK digate BR-03)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id, { requiresDisposalApproval: true });
      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Mesin Las Lama" }),
      );
      const schedule = await tenantContextStorage.run(actorCtx, () =>
        scheduleService.create({ assetId: asset.id, maintenanceType: "Kalibrasi", intervalType: "MONTHS", intervalValue: 6, nextDueDate: new Date() }),
      );

      const retired = await tenantContextStorage.run(actorCtx, () => transferService.retire(asset.id));
      expect(retired.lifecycleStatus).toBe("RETIRED");

      const afterSchedule = await adminPrisma.maintenanceSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
      expect(afterSchedule.isActive).toBe(false);
    });

    it("requestDisposal() kategori TANPA requires_disposal_approval: disposal langsung + jadwal nonaktif", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id, { requiresDisposalApproval: false });
      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Kursi Kantor Rusak" }),
      );
      const schedule = await tenantContextStorage.run(actorCtx, () =>
        scheduleService.create({ assetId: asset.id, maintenanceType: "-", intervalType: "MONTHS", intervalValue: 1, nextDueDate: new Date() }),
      );

      const disposed = await tenantContextStorage.run(actorCtx, () => transferService.requestDisposal(asset.id));
      expect(disposed.lifecycleStatus).toBe("DISPOSED");
      expect(disposed.disposalWorkflowInstanceId).toBeNull();

      const afterSchedule = await adminPrisma.maintenanceSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
      expect(afterSchedule.isActive).toBe(false);
    });

    it("requestDisposal() kategori DENGAN requires_disposal_approval: BR-03 mulai Workflow Engine 1-stage — APPROVED", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id, { requiresDisposalApproval: true });
      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Crane Tower Bekas" }),
      );
      const schedule = await tenantContextStorage.run(actorCtx, () =>
        scheduleService.create({ assetId: asset.id, maintenanceType: "-", intervalType: "MONTHS", intervalValue: 1, nextDueDate: new Date() }),
      );

      const pending = await tenantContextStorage.run(actorCtx, () => transferService.requestDisposal(asset.id));
      expect(pending.lifecycleStatus).toBe("ACTIVE"); // BELUM disposed sampai disetujui
      expect(pending.disposalWorkflowInstanceId).not.toBeNull();

      await approveTask(t.fixture.tenantId, pending.disposalWorkflowInstanceId!, t.companyAdmin.id);

      const disposed = await adminPrisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
      expect(disposed.lifecycleStatus).toBe("DISPOSED");
      // pointer historis TIDAK di-null-kan pasca approval (sekali-pakai, lihat banner comment AssetTransferService).
      expect(disposed.disposalWorkflowInstanceId).toBe(pending.disposalWorkflowInstanceId);

      const afterSchedule = await adminPrisma.maintenanceSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
      expect(afterSchedule.isActive).toBe(false);
    }, 30000);

    it("requestDisposal() kategori DENGAN requires_disposal_approval: REJECTED -> lifecycle_status tidak berubah", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id, { requiresDisposalApproval: true });
      const asset = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Panel Listrik Tua" }),
      );

      const pending = await tenantContextStorage.run(actorCtx, () => transferService.requestDisposal(asset.id));
      await rejectTask(t.fixture.tenantId, pending.disposalWorkflowInstanceId!, t.companyAdmin.id);

      const stillActive = await adminPrisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
      expect(stillActive.lifecycleStatus).toBe("ACTIVE");
      expect(stillActive.disposalWorkflowInstanceId).toBe(pending.disposalWorkflowInstanceId);
    }, 30000);
  });

  describe("maintenance-due-scan — H-7 + overdue satu pass, idempotency, resolusi penerima", () => {
    it("dueSoon (responsibleRoleId eksplisit) + overdue (fallback SUPERVISOR + cc HSE_MANAGER), idempoten pada scan kedua", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.facilityOfficer.id };
      const category = await seedCategory(t.fixture.tenantId, t.facilityOfficer.id);
      const supervisorRole = await adminPrisma.role.findFirstOrThrow({ where: { tenantId: null, roleCode: "SUPERVISOR" } });

      const assetA = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Chiller Lantai 2" }),
      );
      const dueSoonDate = new Date();
      dueSoonDate.setDate(dueSoonDate.getDate() + 5); // dalam window H-7.
      const scheduleDueSoon = await tenantContextStorage.run(actorCtx, () =>
        scheduleService.create({
          assetId: assetA.id,
          maintenanceType: "Ganti filter",
          intervalType: "MONTHS",
          intervalValue: 1,
          nextDueDate: dueSoonDate,
          responsibleRoleId: supervisorRole.id,
        }),
      );

      const assetB = await tenantContextStorage.run(actorCtx, () =>
        assetService.create({ siteId: t.siteId, assetCategoryId: category.id, assetName: "Lift Barang" }),
      );
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 3); // sudah lewat.
      const scheduleOverdue = await tenantContextStorage.run(actorCtx, () =>
        scheduleService.create({ assetId: assetB.id, maintenanceType: "Inspeksi tahunan", intervalType: "MONTHS", intervalValue: 12, nextDueDate: overdueDate }),
      );

      await scanService.scan();

      const afterScanDueSoon = await adminPrisma.maintenanceSchedule.findUniqueOrThrow({ where: { id: scheduleDueSoon.id } });
      expect(afterScanDueSoon.dueSoonReminderSentAt).not.toBeNull();
      const afterScanOverdue = await adminPrisma.maintenanceSchedule.findUniqueOrThrow({ where: { id: scheduleOverdue.id } });
      expect(afterScanOverdue.overdueNotifiedAt).not.toBeNull();

      const dueSoonNotif = await adminPrisma.notification.findFirst({
        where: {
          tenantId: t.fixture.tenantId,
          eventType: "ASSET_EQUIPMENT_MAINTENANCE_DUE_SOON",
          entityId: scheduleDueSoon.id,
          recipientUserId: t.facilityOfficer.id,
        },
      });
      expect(dueSoonNotif).not.toBeNull();

      const overdueNotifSupervisor = await adminPrisma.notification.findFirst({
        where: {
          tenantId: t.fixture.tenantId,
          eventType: "ASSET_EQUIPMENT_MAINTENANCE_OVERDUE",
          entityId: scheduleOverdue.id,
          recipientUserId: t.facilityOfficer.id,
        },
      });
      expect(overdueNotifSupervisor).not.toBeNull();
      expect(overdueNotifSupervisor!.priority).toBe("HIGH");

      const overdueNotifHse = await adminPrisma.notification.findFirst({
        where: {
          tenantId: t.fixture.tenantId,
          eventType: "ASSET_EQUIPMENT_MAINTENANCE_OVERDUE",
          entityId: scheduleOverdue.id,
          recipientUserId: t.hseManager.id,
        },
      });
      expect(overdueNotifHse).not.toBeNull();

      const dueSoonCountBefore = await adminPrisma.notification.count({
        where: { tenantId: t.fixture.tenantId, eventType: "ASSET_EQUIPMENT_MAINTENANCE_DUE_SOON", entityId: scheduleDueSoon.id },
      });
      const overdueCountBefore = await adminPrisma.notification.count({
        where: { tenantId: t.fixture.tenantId, eventType: "ASSET_EQUIPMENT_MAINTENANCE_OVERDUE", entityId: scheduleOverdue.id },
      });

      await scanService.scan();

      const dueSoonCountAfter = await adminPrisma.notification.count({
        where: { tenantId: t.fixture.tenantId, eventType: "ASSET_EQUIPMENT_MAINTENANCE_DUE_SOON", entityId: scheduleDueSoon.id },
      });
      const overdueCountAfter = await adminPrisma.notification.count({
        where: { tenantId: t.fixture.tenantId, eventType: "ASSET_EQUIPMENT_MAINTENANCE_OVERDUE", entityId: scheduleOverdue.id },
      });
      expect(dueSoonCountAfter).toBe(dueSoonCountBefore);
      expect(overdueCountAfter).toBe(overdueCountBefore);
    }, 30000);
  });

  describe("Isolasi tenant (RLS)", () => {
    it("AssetService.update() thd aset tenant lain -> not found", async () => {
      const tenantA = await setupTenant();
      const tenantB = await setupTenant();
      const categoryA = await seedCategory(tenantA.fixture.tenantId, tenantA.facilityOfficer.id);
      const actorA = { tenantId: tenantA.fixture.tenantId, userId: tenantA.facilityOfficer.id };
      const actorB = { tenantId: tenantB.fixture.tenantId, userId: tenantB.facilityOfficer.id };

      const asset = await tenantContextStorage.run(actorA, () =>
        assetService.create({ siteId: tenantA.siteId, assetCategoryId: categoryA.id, assetName: "Aset Tenant A" }),
      );

      await expect(tenantContextStorage.run(actorB, () => assetService.update(asset.id, { manufacturer: "Harus Gagal" }))).rejects.toThrow();
    });

    it("AssetCategoryService.getById() thd kategori tenant lain -> not found", async () => {
      const tenantA = await setupTenant();
      const tenantB = await setupTenant();
      const categoryA = await seedCategory(tenantA.fixture.tenantId, tenantA.facilityOfficer.id);
      const actorB = { tenantId: tenantB.fixture.tenantId, userId: tenantB.facilityOfficer.id };

      await expect(tenantContextStorage.run(actorB, () => categoryService.getById(categoryA.id))).rejects.toThrow();
    });
  });
});
