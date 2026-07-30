import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { seedCalibrationNotificationTemplates } from "../../prisma/seed-calibration-notification-templates";
import { CalibrationCertificateService } from "../../src/modules/domains/calibration/calibration-certificate.service";
import { CalibrationDueScanService } from "../../src/modules/domains/calibration/calibration-due-scan.service";
import { CalibrationItemService } from "../../src/modules/domains/calibration/calibration-item.service";
import { CalibrationProviderService } from "../../src/modules/domains/calibration/calibration-provider.service";
import { CalibrationScheduleService } from "../../src/modules/domains/calibration/calibration-schedule.service";
import { AssetTransferService } from "../../src/modules/domains/asset-equipment/asset-transfer.service";
import { OutOfToleranceRecordService } from "../../src/modules/domains/calibration/out-of-tolerance-record.service";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, seedAsset, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Task 6.2 (Modul 16 Calibration Management) — cakupan: CalibrationItem
 * create (denormalisasi site/tag dari assets) + BR-01 (unique by-construction);
 * CalibrationProvider CRUD; CalibrationSchedule numbering + reset idempotency
 * pada update(); CalibrationCertificate BR-03 (next_due_date server-computed),
 * BR-04 (auto-OOT saat FAIL), BR-05 (gate akreditasi + override justifikasi),
 * siklus review 1-stage (APPROVED+PASS->jadwal berikutnya otomatis;
 * APPROVED+CONDITIONAL_PASS->TIDAK; REJECTED->tetap ISSUED); OutOfToleranceRecord
 * BR-06 (OR-rule re-evaluasi requires_capa saat assessImpact) + BR-07 (gate
 * closure); BR-08 (sinkronisasi site_id event-driven dari AssetTransferService);
 * calibration-due-scan (H-30/14/7/1 due-soon, BR-09 transisi OVERDUE, H-60
 * akreditasi provider, idempotency) + E2E-5 (due -> reminder -> notifikasi ->
 * ditandai selesai); isolasi tenant RLS.
 */
describe("Calibration Management — Modul 16 (task 6.2)", () => {
  let app: INestApplication;
  let itemService: CalibrationItemService;
  let providerService: CalibrationProviderService;
  let scheduleService: CalibrationScheduleService;
  let certificateService: CalibrationCertificateService;
  let ootService: OutOfToleranceRecordService;
  let scanService: CalibrationDueScanService;
  let assetTransferService: AssetTransferService;
  let workflowEngineService: WorkflowEngineService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    itemService = app.get(CalibrationItemService);
    providerService = app.get(CalibrationProviderService);
    scheduleService = app.get(CalibrationScheduleService);
    certificateService = app.get(CalibrationCertificateService);
    ootService = app.get(OutOfToleranceRecordService);
    scanService = app.get(CalibrationDueScanService);
    assetTransferService = app.get(AssetTransferService);
    workflowEngineService = app.get(WorkflowEngineService);
    await seedCalibrationNotificationTemplates(adminPrisma);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function setupTenant() {
    const fixture = await seedTenantFixture();
    const coordinator = await seedUserInTenant(fixture.tenantId, "Calibration Coordinator");
    await assignRole(fixture.tenantId, coordinator.id, "QC_INSPECTOR");
    const hseOfficer = await seedUserInTenant(fixture.tenantId, "HSE Officer");
    await assignRole(fixture.tenantId, hseOfficer.id, "HSE_OFFICER");
    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    const custodian = await seedUserInTenant(fixture.tenantId, "Asset Custodian");
    await assignRole(fixture.tenantId, custodian.id, "SUPERVISOR");
    const { companyId, siteId } = await seedSite(fixture.tenantId, fixture.userId);
    return { fixture, coordinator, hseOfficer, hseManager, custodian, companyId, siteId };
  }

  async function seedInternalLabProvider(tenantId: string, actorUserId: string) {
    return tenantContextStorage.run({ tenantId, userId: actorUserId }, () =>
      providerService.create({ providerName: "Lab Internal Fixture", providerType: "INTERNAL_LAB" }),
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

  describe("CalibrationItem — create + BR-01", () => {
    it("create() denormalisasi site_id/equipment_tag_no dari assets, is_critical_measurement default dari isSafetyCritical", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId, { isSafetyCritical: true });

      const item = await tenantContextStorage.run(actorCtx, () =>
        itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }),
      );
      expect(item.siteId).toBe(t.siteId);
      expect(item.isCriticalMeasurement).toBe(true);
      expect(item.equipmentTagNo).not.toBeNull();
      expect(item.calibrationStatus).toBe("ACTIVE");
    });

    it("BR-01: create() kedua utk asset yang sama ditolak (unique by construction)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);

      await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));
      await expect(
        tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Temperature", calibrationIntervalMonths: 6 })),
      ).rejects.toThrow();
    });
  });

  describe("CalibrationProvider — CRUD", () => {
    it("create->update, accreditation fields tersimpan", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };

      const provider = await tenantContextStorage.run(actorCtx, () =>
        providerService.create({
          providerName: "Lab Eksternal Fixture",
          providerType: "EXTERNAL_LAB",
          accreditationBody: "KAN",
          accreditationValidUntil: new Date("2030-01-01"),
        }),
      );
      expect(provider.accreditationBody).toBe("KAN");

      const updated = await tenantContextStorage.run(actorCtx, () => providerService.update(provider.id, { providerName: "Lab Eksternal Fixture (Updated)" }));
      expect(updated.providerName).toContain("Updated");
    });
  });

  describe("CalibrationSchedule — numbering + reset idempotency pada update()", () => {
    it("create() menghasilkan calibrationWoNo pola WO-CAL/{SITE}/{YYYY}/{SEQ}", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));

      const schedule = await tenantContextStorage.run(actorCtx, () =>
        scheduleService.create({ calibrationItemId: item.id, dueDate: new Date("2026-12-01") }),
      );
      expect(schedule.calibrationWoNo).toContain("WO-CAL");
      expect(schedule.status).toBe("SCHEDULED");
    });

    it("update() dueDate baru mereset SELURUH kolom reminder+overdue", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));
      const schedule = await tenantContextStorage.run(actorCtx, () => scheduleService.create({ calibrationItemId: item.id, dueDate: new Date("2026-12-01") }));

      await adminPrisma.calibrationSchedule.update({
        where: { id: schedule.id },
        data: { reminderSentAtDay30: new Date(), reminderSentAtDay14: new Date(), reminderSentAtDay7: new Date(), reminderSentAtDay1: new Date(), overdueNotifiedAt: new Date() },
      });

      const postponed = new Date("2027-01-15");
      const updated = await tenantContextStorage.run(actorCtx, () => scheduleService.update(schedule.id, { dueDate: postponed }));
      expect(updated.reminderSentAtDay30).toBeNull();
      expect(updated.reminderSentAtDay14).toBeNull();
      expect(updated.reminderSentAtDay7).toBeNull();
      expect(updated.reminderSentAtDay1).toBeNull();
      expect(updated.overdueNotifiedAt).toBeNull();
    });
  });

  describe("CalibrationCertificate — BR-03 next_due_date server-computed, BR-04 auto-OOT saat FAIL", () => {
    it("BR-03: next_due_date = calibrationDate + calibrationIntervalMonths (TIDAK bisa diinput manual)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));
      const provider = await seedInternalLabProvider(t.fixture.tenantId, t.fixture.userId);

      const cert = await tenantContextStorage.run(actorCtx, () =>
        certificateService.create({
          calibrationItemId: item.id,
          certificateNo: `CERT-${randomUUID().slice(0, 8)}`,
          calibrationProviderId: provider.id,
          calibrationDate: new Date("2026-01-15T00:00:00Z"),
          calibrationResult: "PASS",
        }),
      );
      expect(cert.nextDueDate.toISOString().slice(0, 10)).toBe("2027-01-15");
      expect(cert.status).toBe("DRAFT");
      expect(cert.internalReferenceNo).toContain("CAL-CERT");
    });

    it("BR-04: hasil FAIL otomatis membuat out_of_tolerance_records IDENTIFIED + notifikasi HSE Manager/Officer; PASS tidak", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId, { isSafetyCritical: true });
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));
      const provider = await seedInternalLabProvider(t.fixture.tenantId, t.fixture.userId);

      const failCert = await tenantContextStorage.run(actorCtx, () =>
        certificateService.create({
          calibrationItemId: item.id,
          certificateNo: `CERT-${randomUUID().slice(0, 8)}`,
          calibrationProviderId: provider.id,
          calibrationDate: new Date(),
          calibrationResult: "FAIL",
        }),
      );

      const oot = await adminPrisma.outOfToleranceRecord.findFirstOrThrow({ where: { calibrationCertificateId: failCert.id } });
      expect(oot.status).toBe("IDENTIFIED");
      expect(oot.requiresCapa).toBe(true); // is_critical_measurement=true (BR-06 saat create)

      const notif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "CALIBRATION_RESULT_FAIL", recipientUserId: t.hseManager.id },
      });
      expect(notif).not.toBeNull();
      expect(notif!.priority).toBe("HIGH");

      const passCert = await tenantContextStorage.run(actorCtx, () =>
        certificateService.create({
          calibrationItemId: item.id,
          certificateNo: `CERT-${randomUUID().slice(0, 8)}`,
          calibrationProviderId: provider.id,
          calibrationDate: new Date(),
          calibrationResult: "PASS",
        }),
      );
      const noOot = await adminPrisma.outOfToleranceRecord.findFirst({ where: { calibrationCertificateId: passCert.id } });
      expect(noOot).toBeNull();
    });
  });

  describe("CalibrationCertificate — BR-05 gate akreditasi + siklus review 1-stage", () => {
    it("BR-05: submitForReview() ditolak jika EXTERNAL_LAB akreditasi lewat pada calibration_date, lolos dgn override justifikasi", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));
      const provider = await tenantContextStorage.run(actorCtx, () =>
        providerService.create({ providerName: "Lab Expired", providerType: "EXTERNAL_LAB", accreditationValidUntil: new Date("2026-01-01") }),
      );

      const cert = await tenantContextStorage.run(actorCtx, () =>
        certificateService.create({
          calibrationItemId: item.id,
          certificateNo: `CERT-${randomUUID().slice(0, 8)}`,
          calibrationProviderId: provider.id,
          calibrationDate: new Date("2026-06-01"), // SETELAH accreditationValidUntil
          calibrationResult: "PASS",
        }),
      );

      await expect(tenantContextStorage.run(actorCtx, () => certificateService.submitForReview(cert.id))).rejects.toThrow(/BR-05/);

      const overridden = await tenantContextStorage.run(actorCtx, () =>
        certificateService.submitForReview(cert.id, "Kondisi darurat operasional — override disetujui Coordinator"),
      );
      expect(overridden.status).toBe("ISSUED");
      expect(overridden.workflowInstanceId).not.toBeNull();

      const auditRow = await adminPrisma.systemAuditLog.findFirst({
        where: { action: "OVERRIDE", entityType: "calibration_certificate", entityId: cert.id },
      });
      expect(auditRow).not.toBeNull();
    }, 30000);

    it("INTERNAL_LAB TIDAK butuh akreditasi — submitForReview() langsung lolos tanpa override", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));
      const provider = await seedInternalLabProvider(t.fixture.tenantId, t.fixture.userId);
      const cert = await tenantContextStorage.run(actorCtx, () =>
        certificateService.create({
          calibrationItemId: item.id,
          certificateNo: `CERT-${randomUUID().slice(0, 8)}`,
          calibrationProviderId: provider.id,
          calibrationDate: new Date(),
          calibrationResult: "PASS",
        }),
      );

      const issued = await tenantContextStorage.run(actorCtx, () => certificateService.submitForReview(cert.id));
      expect(issued.status).toBe("ISSUED");
    }, 30000);

    it("review APPROVED + hasil PASS: status REVIEWED + jadwal berikutnya otomatis dibuat", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 6 }));
      const provider = await seedInternalLabProvider(t.fixture.tenantId, t.fixture.userId);
      const cert = await tenantContextStorage.run(actorCtx, () =>
        certificateService.create({
          calibrationItemId: item.id,
          certificateNo: `CERT-${randomUUID().slice(0, 8)}`,
          calibrationProviderId: provider.id,
          calibrationDate: new Date("2026-02-01"),
          calibrationResult: "PASS",
        }),
      );
      const issued = await tenantContextStorage.run(actorCtx, () => certificateService.submitForReview(cert.id));
      await approveTask(t.fixture.tenantId, issued.workflowInstanceId!, t.hseOfficer.id);

      const reviewed = await adminPrisma.calibrationCertificate.findUniqueOrThrow({ where: { id: cert.id } });
      expect(reviewed.status).toBe("REVIEWED");
      expect(reviewed.isReviewed).toBe(true);
      expect(reviewed.workflowInstanceId).toBeNull();

      const nextSchedule = await adminPrisma.calibrationSchedule.findFirst({ where: { calibrationItemId: item.id, dueDate: reviewed.nextDueDate } });
      expect(nextSchedule).not.toBeNull();
    }, 30000);

    it("review APPROVED + hasil CONDITIONAL_PASS: TIDAK memicu jadwal berikutnya otomatis (PRD literal hanya PASS)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 6 }));
      const provider = await seedInternalLabProvider(t.fixture.tenantId, t.fixture.userId);
      const cert = await tenantContextStorage.run(actorCtx, () =>
        certificateService.create({
          calibrationItemId: item.id,
          certificateNo: `CERT-${randomUUID().slice(0, 8)}`,
          calibrationProviderId: provider.id,
          calibrationDate: new Date(),
          calibrationResult: "CONDITIONAL_PASS",
        }),
      );
      const issued = await tenantContextStorage.run(actorCtx, () => certificateService.submitForReview(cert.id));
      await approveTask(t.fixture.tenantId, issued.workflowInstanceId!, t.hseOfficer.id);

      const reviewed = await adminPrisma.calibrationCertificate.findUniqueOrThrow({ where: { id: cert.id } });
      expect(reviewed.status).toBe("REVIEWED");

      const scheduleCount = await adminPrisma.calibrationSchedule.count({ where: { calibrationItemId: item.id } });
      expect(scheduleCount).toBe(0);
    }, 30000);

    it("review REJECTED: workflowInstanceId di-null-kan, status TETAP ISSUED (bisa resubmit)", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 6 }));
      const provider = await seedInternalLabProvider(t.fixture.tenantId, t.fixture.userId);
      const cert = await tenantContextStorage.run(actorCtx, () =>
        certificateService.create({
          calibrationItemId: item.id,
          certificateNo: `CERT-${randomUUID().slice(0, 8)}`,
          calibrationProviderId: provider.id,
          calibrationDate: new Date(),
          calibrationResult: "PASS",
        }),
      );
      const issued = await tenantContextStorage.run(actorCtx, () => certificateService.submitForReview(cert.id));
      await rejectTask(t.fixture.tenantId, issued.workflowInstanceId!, t.hseOfficer.id);

      const afterReject = await adminPrisma.calibrationCertificate.findUniqueOrThrow({ where: { id: cert.id } });
      expect(afterReject.status).toBe("ISSUED");
      expect(afterReject.workflowInstanceId).toBeNull();
    }, 30000);
  });

  describe("OutOfToleranceRecord — BR-06 OR-rule + BR-07 gate closure", () => {
    it("assessImpact() re-evaluasi requires_capa via OR-rule; close() ditolak sampai linkCapaRegister dipanggil", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId, { isSafetyCritical: false });
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));
      const provider = await seedInternalLabProvider(t.fixture.tenantId, t.fixture.userId);
      const cert = await tenantContextStorage.run(actorCtx, () =>
        certificateService.create({
          calibrationItemId: item.id,
          certificateNo: `CERT-${randomUUID().slice(0, 8)}`,
          calibrationProviderId: provider.id,
          calibrationDate: new Date(),
          calibrationResult: "FAIL",
        }),
      );
      const oot = await adminPrisma.outOfToleranceRecord.findFirstOrThrow({ where: { calibrationCertificateId: cert.id } });
      expect(oot.requiresCapa).toBe(false); // item TIDAK kritis, BR-06 creation-time false

      const assessed = await tenantContextStorage.run(actorCtx, () =>
        ootService.assessImpact(oot.id, { impactLevel: "HIGH", potentialImpactAssessment: "Berpotensi memengaruhi hasil gas test." }),
      );
      expect(assessed.status).toBe("ASSESSED");
      expect(assessed.requiresCapa).toBe(true); // §4.2 poin 3 OR-rule: impact HIGH menang meski item tidak kritis

      await expect(tenantContextStorage.run(actorCtx, () => ootService.close(oot.id))).rejects.toThrow(/BR-07/);

      const capa = await adminPrisma.capaRegister.create({
        data: {
          tenantId: t.fixture.tenantId,
          capaNumber: `CAPA-${randomUUID().slice(0, 8)}`,
          sourceType: "OTHER",
          category: "CORRECTIVE",
          priority: "HIGH",
          title: "CAPA dari OOT kalibrasi",
          problemStatement: "Hasil kalibrasi out of tolerance.",
          companyId: t.companyId,
          siteId: t.siteId,
          initiatedBy: t.coordinator.id,
          initiatedAt: new Date(),
          createdBy: t.coordinator.id,
          updatedBy: t.coordinator.id,
        },
      });

      const linked = await tenantContextStorage.run(actorCtx, () => ootService.linkCapaRegister(oot.id, capa.id));
      expect(linked.status).toBe("CAPA_INITIATED");

      const closed = await tenantContextStorage.run(actorCtx, () => ootService.close(oot.id));
      expect(closed.status).toBe("CLOSED");
      expect(closed.closedBy).toBe(t.coordinator.id);
      expect(closed.closedAt).not.toBeNull();
    });
  });

  describe("BR-08 — sinkronisasi calibration_items.site_id event-driven", () => {
    it("AssetTransferService.transfer() mengubah site aset -> calibration_items.site_id ikut sinkron", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));

      const { siteId: siteId2 } = await seedSite(t.fixture.tenantId, t.fixture.userId);
      await tenantContextStorage.run(actorCtx, () => assetTransferService.transfer({ assetId, toSiteId: siteId2, transferDate: new Date() }));

      await sleep(300); // event stub async — beri waktu CalibrationItemAssetSiteSyncListener memproses.

      const synced = await adminPrisma.calibrationItem.findUniqueOrThrow({ where: { id: item.id } });
      expect(synced.siteId).toBe(siteId2);
    }, 15000);
  });

  describe("calibration-due-scan — H-30/14/7/1 due-soon, BR-09 OVERDUE, H-60 akreditasi provider, idempotency", () => {
    it("dueSoon tier + overdue + akreditasi provider dalam satu scan pass, idempoten pada scan kedua", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId: assetA } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const itemA = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId: assetA, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));
      const dueSoonDate = new Date();
      dueSoonDate.setDate(dueSoonDate.getDate() + 5); // dalam window H-7 (DAN H-14, H-30).
      const scheduleDueSoon = await tenantContextStorage.run(actorCtx, () => scheduleService.create({ calibrationItemId: itemA.id, dueDate: dueSoonDate }));

      const { assetId: assetB } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const itemB = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId: assetB, measurementParameter: "Temperature", calibrationIntervalMonths: 12 }));
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 3);
      const scheduleOverdue = await tenantContextStorage.run(actorCtx, () => scheduleService.create({ calibrationItemId: itemB.id, dueDate: overdueDate }));

      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 30); // dalam window H-60.
      const provider = await tenantContextStorage.run(actorCtx, () =>
        providerService.create({ providerName: "Lab Akreditasi Mendekati Habis", providerType: "EXTERNAL_LAB", accreditationValidUntil: expiringDate }),
      );

      await scanService.scan();

      const afterScanDueSoon = await adminPrisma.calibrationSchedule.findUniqueOrThrow({ where: { id: scheduleDueSoon.id } });
      expect(afterScanDueSoon.reminderSentAtDay7).not.toBeNull();
      expect(afterScanDueSoon.reminderSentAtDay30).not.toBeNull(); // catch-up: kedua tier due-soon SEKALIGUS.

      const afterScanOverdue = await adminPrisma.calibrationSchedule.findUniqueOrThrow({ where: { id: scheduleOverdue.id } });
      expect(afterScanOverdue.status).toBe("OVERDUE"); // BR-09
      expect(afterScanOverdue.overdueNotifiedAt).not.toBeNull();

      const afterScanProvider = await adminPrisma.calibrationProvider.findUniqueOrThrow({ where: { id: provider.id } });
      expect(afterScanProvider.accreditationExpiryWarningSentAt).not.toBeNull();

      const dueSoonNotif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "CALIBRATION_DUE_SOON", entityId: scheduleDueSoon.id, recipientUserId: t.coordinator.id },
      });
      expect(dueSoonNotif).not.toBeNull();

      const overdueNotifHse = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "CALIBRATION_SCHEDULE_OVERDUE", entityId: scheduleOverdue.id, recipientUserId: t.hseManager.id },
      });
      expect(overdueNotifHse).not.toBeNull();

      const providerNotif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "CALIBRATION_PROVIDER_ACCREDITATION_EXPIRING", entityId: provider.id, recipientUserId: t.coordinator.id },
      });
      expect(providerNotif).not.toBeNull();

      // Idempotency — scan kedua tidak menghasilkan notifikasi duplikat.
      const countBefore = await adminPrisma.notification.count({ where: { tenantId: t.fixture.tenantId, eventType: "CALIBRATION_DUE_SOON" } });
      await scanService.scan();
      const countAfter = await adminPrisma.notification.count({ where: { tenantId: t.fixture.tenantId, eventType: "CALIBRATION_DUE_SOON" } });
      expect(countAfter).toBe(countBefore);
    }, 30000);

    it("E2E-5: jadwal jatuh tempo -> reminder job -> notifikasi -> tenaga kerja tandai selesai", async () => {
      const t = await setupTenant();
      const actorCtx = { tenantId: t.fixture.tenantId, userId: t.coordinator.id };
      const { assetId } = await seedAsset(t.fixture.tenantId, t.siteId, t.fixture.userId);
      const item = await tenantContextStorage.run(actorCtx, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1); // dalam window H-1.
      const schedule = await tenantContextStorage.run(actorCtx, () => scheduleService.create({ calibrationItemId: item.id, dueDate }));

      await scanService.scan();

      const notif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "CALIBRATION_DUE_SOON", entityId: schedule.id, recipientUserId: t.coordinator.id },
      });
      expect(notif).not.toBeNull();

      const completed = await tenantContextStorage.run(actorCtx, () => scheduleService.update(schedule.id, { status: "COMPLETED" }));
      expect(completed.status).toBe("COMPLETED");
    }, 30000);
  });

  describe("Isolasi tenant (RLS)", () => {
    it("CalibrationItemService.getById() thd item tenant lain -> not found", async () => {
      const tenantA = await setupTenant();
      const tenantB = await setupTenant();
      const actorA = { tenantId: tenantA.fixture.tenantId, userId: tenantA.coordinator.id };
      const actorB = { tenantId: tenantB.fixture.tenantId, userId: tenantB.coordinator.id };
      const { assetId } = await seedAsset(tenantA.fixture.tenantId, tenantA.siteId, tenantA.fixture.userId);

      const item = await tenantContextStorage.run(actorA, () => itemService.create({ assetId, measurementParameter: "Pressure", calibrationIntervalMonths: 12 }));

      await expect(tenantContextStorage.run(actorB, () => itemService.getById(item.id))).rejects.toThrow();
    });
  });
});
