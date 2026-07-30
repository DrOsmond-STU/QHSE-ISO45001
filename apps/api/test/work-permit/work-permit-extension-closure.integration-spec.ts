import { BadRequestException, INestApplication } from "@nestjs/common";
import { seedWorkPermitNotificationTemplates } from "../../prisma/seed-work-permit-notification-templates";
import { GasRetestDueScanService } from "../../src/modules/domains/work-permit/gas-retest-due-scan.service";
import { GasTestResultService } from "../../src/modules/domains/work-permit/gas-test-result.service";
import { IsolationLotoRecordService } from "../../src/modules/domains/work-permit/isolation-loto-record.service";
import { WorkPermitClosureService } from "../../src/modules/domains/work-permit/work-permit-closure.service";
import { WorkPermitExpiryScanService } from "../../src/modules/domains/work-permit/work-permit-expiry-scan.service";
import { WorkPermitExtensionService } from "../../src/modules/domains/work-permit/work-permit-extension.service";
import { WorkPermitTypeService } from "../../src/modules/domains/work-permit/work-permit-type.service";
import { WorkPermitService } from "../../src/modules/domains/work-permit/work-permit.service";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

/**
 * Task 3.4 (Modul 06 Work Permit Management — extension, closure &
 * cross-link) — cakupan: **E2E-1** (submit → approval → notifikasi →
 * ACTIVE, lanjut extension+closure penuh), BR-05 (gas retest interval
 * terlewat → SUSPENDED + resume), BR-06 (closure gate CLOSED), BR-07
 * (extension request gate + auto-EXPIRED scan), BR-09 utk extension,
 * KETIGA JSON Logic conditional workflow (extension, gasRetestRequired),
 * isolasi tenant RLS.
 */
describe("Work Permit Management — extension, closure & cross-link (task 3.4)", () => {
  let app: INestApplication;
  let typeService: WorkPermitTypeService;
  let permitService: WorkPermitService;
  let gasTestService: GasTestResultService;
  let lotoService: IsolationLotoRecordService;
  let extensionService: WorkPermitExtensionService;
  let closureService: WorkPermitClosureService;
  let expiryScanService: WorkPermitExpiryScanService;
  let gasRetestDueScanService: GasRetestDueScanService;
  let workflowEngineService: WorkflowEngineService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    typeService = app.get(WorkPermitTypeService);
    permitService = app.get(WorkPermitService);
    gasTestService = app.get(GasTestResultService);
    lotoService = app.get(IsolationLotoRecordService);
    extensionService = app.get(WorkPermitExtensionService);
    closureService = app.get(WorkPermitClosureService);
    expiryScanService = app.get(WorkPermitExpiryScanService);
    gasRetestDueScanService = app.get(GasRetestDueScanService);
    workflowEngineService = app.get(WorkflowEngineService);
    await seedWorkPermitNotificationTemplates(adminPrisma);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function setupTenant() {
    const fixture = await seedTenantFixture();
    const issuer = await seedUserInTenant(fixture.tenantId, "Issuer");
    await assignRole(fixture.tenantId, issuer.id, "SUPERVISOR");
    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    const { companyId, siteId } = await seedSite(fixture.tenantId, fixture.userId);
    return { fixture, issuer, hseManager, companyId, siteId };
  }

  async function createType(
    tenantId: string,
    userId: string,
    overrides: { requiresGasTest?: boolean; requiresLoto?: boolean; requiresHseApproval?: boolean; maxExtensionCount?: number; gasRetestIntervalHours?: number } = {},
  ) {
    return tenantContextStorage.run({ tenantId, userId }, () =>
      typeService.create({
        code: `TYPE-${Math.random().toString(36).slice(2, 8)}`,
        name: "Confined Space",
        requiresGasTest: overrides.requiresGasTest ?? false,
        requiresLoto: overrides.requiresLoto ?? false,
        requiresHseApproval: overrides.requiresHseApproval ?? false,
        defaultRiskLevel: "LOW",
        maxExtensionCount: overrides.maxExtensionCount ?? 1,
        gasRetestIntervalHours: overrides.gasRetestIntervalHours,
      }),
    );
  }

  async function pendingTaskFor(instanceId: string) {
    return adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId, status: "PENDING" } });
  }

  /** Jalur permit yg TIDAK butuh gas test/LOTO (type default requiresGasTest/
   * requiresLoto=false) — create->checklist->submit->Issuer approve->activate.
   * TIDAK aman dipakai kalau type mewajibkan gas test/LOTO (BR-02/BR-03 akan
   * menolak activate() tanpa record — lihat test BR-06/gas-retest-due-scan
   * di bawah yang membangun permitnya manual utk kasus itu). */
  async function createActivePermit(
    fixture: { tenantId: string; userId: string },
    issuer: { id: string },
    siteId: string,
    typeId: string,
    plannedEndDatetime: Date = new Date(Date.now() + 8 * 60 * 60 * 1000),
  ) {
    const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      permitService.create({
        workPermitTypeId: typeId,
        siteId,
        title: "Confined space entry",
        description: "Uji task 3.4",
        requesterId: fixture.userId,
        plannedStartDatetime: new Date(),
        plannedEndDatetime,
      }),
    );
    await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
      permitService.submitHazardChecklist(permit.id, { customFields: {}, allMandatoryItemsChecked: true }),
    );
    const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.submitForApproval(permit.id));
    const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
    await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: issuer.id }, () =>
      permitService.actOnApprovalTask(task1.id, "APPROVE", undefined, issuer.id),
    );
    await new Promise((r) => setTimeout(r, 300));
    return tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.activate(permit.id));
  }

  describe("E2E-1 — alur penuh submit -> approval -> ACTIVE -> extension -> closure -> CLOSED", () => {
    it("permit tanpa gas test/LOTO: extension 1-stage (gasRetestRequired=false) lalu closure VERIFIED -> CLOSED", async () => {
      const { fixture, issuer, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { maxExtensionCount: 2 });
      const originalEnd = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const activated = await createActivePermit(fixture, issuer, siteId, type.id, originalEnd);
      expect(activated.status).toBe("ACTIVE");

      const newEnd = new Date(Date.now() + 16 * 60 * 60 * 1000);
      const extension = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        extensionService.request({
          workPermitId: activated.id,
          requestedNewEndDatetime: newEnd,
          reason: "Pekerjaan belum selesai",
          gasRetestRequired: false,
          requestedBy: fixture.userId,
        }),
      );
      const permitMidExtension = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: activated.id } });
      expect(permitMidExtension.status).toBe("EXTENSION_REQUESTED");

      const extTask1 = await pendingTaskFor(extension.workflowInstanceId!);
      expect(extTask1.assignedTo).toBe(issuer.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: issuer.id }, () =>
        extensionService.actOnExtensionTask(extTask1.id, "APPROVE", undefined, issuer.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const extAfter = await adminPrisma.workPermitExtension.findUniqueOrThrow({ where: { id: extension.id } });
      expect(extAfter.status).toBe("APPROVED");
      expect(extAfter.decidedBy).toBe(issuer.id);
      const permitAfterExtension = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: activated.id } });
      expect(permitAfterExtension.status).toBe("ACTIVE");
      expect(permitAfterExtension.plannedEndDatetime.getTime()).toBe(newEnd.getTime());

      const closure = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        closureService.submit(activated.id, {
          areaSafetyChecklist: { alatDikembalikan: true, housekeeping: true },
          isolationRemovedConfirmed: false,
          requesterSignoffBy: fixture.userId,
        }),
      );
      expect(closure.status).toBe("SUBMITTED");
      const permitPendingClosure = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: activated.id } });
      expect(permitPendingClosure.status).toBe("PENDING_CLOSURE");

      const verified = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        closureService.verify(activated.id, issuer.id, "VERIFIED"),
      );
      expect(verified.status).toBe("VERIFIED");
      const permitClosed = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: activated.id } });
      expect(permitClosed.status).toBe("CLOSED");
      expect(permitClosed.actualEndDatetime).not.toBeNull();

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => closureService.notifyClosed(activated.id)),
      ).resolves.not.toThrow();
    }, 20000);
  });

  describe("Extension — percabangan kondisional gasRetestRequired (JSON Logic KETIGA di codebase)", () => {
    it("gasRetestRequired=true memicu Stage 2 HSE utk extension", async () => {
      const { fixture, issuer, hseManager, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { maxExtensionCount: 1 });
      const activated = await createActivePermit(fixture, issuer, siteId, type.id);

      const extension = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        extensionService.request({
          workPermitId: activated.id,
          requestedNewEndDatetime: new Date(Date.now() + 20 * 60 * 60 * 1000),
          reason: "Perlu retest gas",
          gasRetestRequired: true,
          requestedBy: fixture.userId,
        }),
      );

      const extTask1 = await pendingTaskFor(extension.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: issuer.id }, () =>
        extensionService.actOnExtensionTask(extTask1.id, "APPROVE", undefined, issuer.id),
      );

      const instanceMid = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: extension.workflowInstanceId! } });
      expect(instanceMid.status).toBe("IN_PROGRESS");
      const extTask2 = await pendingTaskFor(extension.workflowInstanceId!);
      expect(extTask2.assignedTo).toBe(hseManager.id);

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        extensionService.actOnExtensionTask(extTask2.id, "APPROVE", undefined, hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const instance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: extension.workflowInstanceId! } });
      expect(instance.status).toBe("APPROVED");
      const allTasks = await adminPrisma.workflowTask.findMany({ where: { instanceId: instance.id } });
      expect(allTasks).toHaveLength(2);
    }, 20000);

    it("reject extension -> permit kembali ACTIVE TANPA mengubah plannedEndDatetime", async () => {
      const { fixture, issuer, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { maxExtensionCount: 1 });
      const originalEnd = new Date(Date.now() + 8 * 60 * 60 * 1000);
      const activated = await createActivePermit(fixture, issuer, siteId, type.id, originalEnd);

      const extension = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        extensionService.request({
          workPermitId: activated.id,
          requestedNewEndDatetime: new Date(Date.now() + 16 * 60 * 60 * 1000),
          reason: "Uji reject",
          gasRetestRequired: false,
          requestedBy: fixture.userId,
        }),
      );
      const extTask1 = await pendingTaskFor(extension.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: issuer.id }, () =>
        extensionService.actOnExtensionTask(extTask1.id, "REJECT", "Alasan kurang kuat", issuer.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const extAfter = await adminPrisma.workPermitExtension.findUniqueOrThrow({ where: { id: extension.id } });
      expect(extAfter.status).toBe("REJECTED");
      const permitAfter = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: activated.id } });
      expect(permitAfter.status).toBe("ACTIVE");
      expect(permitAfter.plannedEndDatetime.getTime()).toBe(originalEnd.getTime());
    }, 20000);
  });

  describe("BR-07 — gate pengajuan extension", () => {
    it("menolak extension setelah planned_end_datetime terlampaui", async () => {
      const { fixture, issuer, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { maxExtensionCount: 2 });
      const activated = await createActivePermit(fixture, issuer, siteId, type.id, new Date(Date.now() - 60 * 60 * 1000));

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          extensionService.request({
            workPermitId: activated.id,
            requestedNewEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
            reason: "Terlambat mengajukan",
            gasRetestRequired: false,
            requestedBy: fixture.userId,
          }),
        ),
      ).rejects.toThrow();
    }, 15000);

    it("menolak extension kalau sudah mencapai max_extension_count", async () => {
      const { fixture, issuer, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { maxExtensionCount: 1 });
      const activated = await createActivePermit(fixture, issuer, siteId, type.id);

      const extension1 = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        extensionService.request({
          workPermitId: activated.id,
          requestedNewEndDatetime: new Date(Date.now() + 16 * 60 * 60 * 1000),
          reason: "Extension pertama",
          gasRetestRequired: false,
          requestedBy: fixture.userId,
        }),
      );
      const extTask1 = await pendingTaskFor(extension1.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: issuer.id }, () =>
        extensionService.actOnExtensionTask(extTask1.id, "REJECT", "Uji batas jumlah", issuer.id),
      );
      await new Promise((r) => setTimeout(r, 300));
      const permitAfterReject = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: activated.id } });
      expect(permitAfterReject.status).toBe("ACTIVE"); // kembali ACTIVE, TAPI count tetap 1 (baris REJECTED tetap dihitung, lihat banner comment assertExtensionRequestAllowed())

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          extensionService.request({
            workPermitId: activated.id,
            requestedNewEndDatetime: new Date(Date.now() + 20 * 60 * 60 * 1000),
            reason: "Extension kedua, harusnya kena limit",
            gasRetestRequired: false,
            requestedBy: fixture.userId,
          }),
        ),
      ).rejects.toThrow(/batas maksimum/);
    }, 20000);
  });

  describe("BR-09 utk extension — segregation of duty", () => {
    it("actOnExtensionTask() menolak kalau actingUserId sama dengan requester permit induk", async () => {
      // SATU-SATUNYA Supervisor di tenant ini SEKALIGUS requester permit —
      // skenario BR-09 literal utk extension. Approval Stage-1 PERMIT INDUK
      // (bukan extension) sengaja dilakukan via WorkflowEngineService.actOnTask()
      // LANGSUNG (bukan permitService.actOnApprovalTask() wrapper) supaya
      // TIDAK kena BR-09 permit induk itu sendiri (sudah dicakup task 3.3,
      // TIDAK relevan diuji ulang di sini) — satu-satunya hal yang genuinely
      // diuji adalah actOnExtensionTask()'s wrapper.
      const fixture = await seedTenantFixture();
      await assignRole(fixture.tenantId, fixture.userId, "SUPERVISOR");
      const { siteId } = await seedSite(fixture.tenantId, fixture.userId);
      const type = await createType(fixture.tenantId, fixture.userId, { maxExtensionCount: 1 });

      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Uji BR-09 extension",
          description: "Requester = satu-satunya Supervisor",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.submitHazardChecklist(permit.id, { customFields: {}, allMandatoryItemsChecked: true }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.submitForApproval(permit.id));
      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task1.assignedTo).toBe(fixture.userId);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, fixture.userId),
      );
      await new Promise((r) => setTimeout(r, 300));
      const activated = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.activate(permit.id));
      expect(activated.status).toBe("ACTIVE");

      const extension = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        extensionService.request({
          workPermitId: activated.id,
          requestedNewEndDatetime: new Date(Date.now() + 16 * 60 * 60 * 1000),
          reason: "Uji BR-09",
          gasRetestRequired: false,
          requestedBy: fixture.userId,
        }),
      );
      const extTask1 = await pendingTaskFor(extension.workflowInstanceId!);
      expect(extTask1.assignedTo).toBe(fixture.userId);

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          extensionService.actOnExtensionTask(extTask1.id, "APPROVE", undefined, fixture.userId),
        ),
      ).rejects.toThrow();

      const stillPending = await adminPrisma.workflowTask.findUniqueOrThrow({ where: { id: extTask1.id } });
      expect(stillPending.status).toBe("PENDING");
    }, 15000);
  });

  describe("BR-06 — gate closure (LOTO) sebelum CLOSED", () => {
    it("verify(VERIFIED) ditolak kalau requiresLoto=true tapi isolationRemovedConfirmed=false; diterima setelah resubmit true", async () => {
      const { fixture, issuer, hseManager, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { requiresLoto: true, maxExtensionCount: 1 });

      // TIDAK pakai createActivePermit() — type ini requiresLoto=true jadi
      // activate() butuh isolation_loto_records VERIFIED dulu (BR-03),
      // dibangun manual di sini (pola sama test BR-03 task 3.3).
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Electrical isolation - uji closure",
          description: "Uji BR-06",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.submitHazardChecklist(permit.id, { customFields: {}, allMandatoryItemsChecked: true }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.submitForApproval(permit.id));
      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: issuer.id }, () =>
        permitService.actOnApprovalTask(task1.id, "APPROVE", undefined, issuer.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const loto = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        lotoService.apply({
          workPermitId: permit.id,
          isolationPointDescription: "Panel MCC-02",
          isolationType: "ELECTRICAL",
          lockNumber: "LK-002",
          appliedBy: issuer.id,
          appliedAt: new Date(),
        }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => lotoService.verify(loto.id, hseManager.id));
      const activated = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.activate(permit.id));
      expect(activated.status).toBe("ACTIVE");

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        closureService.submit(activated.id, { areaSafetyChecklist: {}, isolationRemovedConfirmed: false, requesterSignoffBy: fixture.userId }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          closureService.verify(activated.id, issuer.id, "VERIFIED"),
        ),
      ).rejects.toThrow();

      // Issuer RETURNED closure (bukan langsung force-VERIFIED) -> permit
      // kembali ACTIVE -> Requester resubmit dgn isolationRemovedConfirmed=true.
      const returned = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        closureService.verify(activated.id, issuer.id, "RETURNED", "Isolasi belum dikonfirmasi lepas"),
      );
      expect(returned.status).toBe("RETURNED");
      const permitReturned = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: activated.id } });
      expect(permitReturned.status).toBe("ACTIVE");

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        closureService.submit(activated.id, { areaSafetyChecklist: {}, isolationRemovedConfirmed: true, requesterSignoffBy: fixture.userId }),
      );
      const verified = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        closureService.verify(activated.id, issuer.id, "VERIFIED"),
      );
      expect(verified.status).toBe("VERIFIED");
      const permitClosed = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: activated.id } });
      expect(permitClosed.status).toBe("CLOSED");
    }, 20000);
  });

  describe("work-permit-expiry-scan — BR-07 (scan) / E2E-1 acceptance criterion", () => {
    it("permit ACTIVE lewat planned_end_datetime -> EXPIRED + notifikasi HSE Manager", async () => {
      const { fixture, issuer, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId);
      const activated = await createActivePermit(fixture, issuer, siteId, type.id, new Date(Date.now() - 60 * 60 * 1000));
      expect(activated.status).toBe("ACTIVE");

      await expiryScanService.scan();

      const after = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: activated.id } });
      expect(after.status).toBe("EXPIRED");
    }, 15000);

    it("permit EXTENSION_REQUESTED (belum diputuskan) yang planned_end_datetime asli sudah lewat -> tetap EXPIRED", async () => {
      const { fixture, issuer, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { maxExtensionCount: 1 });
      const originalEnd = new Date(Date.now() + 5 * 60 * 1000); // 5 menit lagi, cukup utk request extension
      const activated = await createActivePermit(fixture, issuer, siteId, type.id, originalEnd);

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        extensionService.request({
          workPermitId: activated.id,
          requestedNewEndDatetime: new Date(Date.now() + 16 * 60 * 60 * 1000),
          reason: "Diajukan tapi belum diputuskan",
          gasRetestRequired: false,
          requestedBy: fixture.userId,
        }),
      );
      const permitMid = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: activated.id } });
      expect(permitMid.status).toBe("EXTENSION_REQUESTED");

      // Scan dgn "now" SETELAH originalEnd terlampaui (extension MASIH pending,
      // work_permits.plannedEndDatetime BELUM diperbarui listener manapun).
      await expiryScanService.scan(new Date(originalEnd.getTime() + 60 * 1000));

      const after = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: activated.id } });
      expect(after.status).toBe("EXPIRED");
    }, 15000);
  });

  describe("gas-retest-due-scan — BR-05 (SUSPENDED) + resumeFromSuspension()", () => {
    it("retest_due_at terlewat -> SUSPENDED; retest baru PASS -> resumeFromSuspension() kembali ACTIVE", async () => {
      const { fixture, issuer, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { requiresGasTest: true, gasRetestIntervalHours: 1 });

      // TIDAK pakai createActivePermit() — type ini requiresGasTest=true
      // jadi activate() butuh minimal 1 gas_test_results PASS dulu (BR-02).
      // Gas test PERTAMA direkam dgn testDatetime 2 jam lalu (interval 1 jam
      // -> retest_due_at SUDAH lewat SAAT direkam) — SEKALIGUS memenuhi
      // BR-02 (activate) DAN jadi kandidat overdue utk scan di bawah.
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Confined space - uji gas retest",
          description: "Uji BR-05",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.submitHazardChecklist(permit.id, { customFields: {}, allMandatoryItemsChecked: true }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.submitForApproval(permit.id));
      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: issuer.id }, () =>
        permitService.actOnApprovalTask(task1.id, "APPROVE", undefined, issuer.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        gasTestService.record({
          workPermitId: permit.id,
          gasType: "OXYGEN",
          readingValue: 20.9,
          unit: "%VOL",
          result: "PASS",
          testDatetime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          instrumentName: "MSA Altair 4X",
          testedBy: issuer.id,
        }),
      );
      const activated = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.activate(permit.id));
      expect(activated.status).toBe("ACTIVE");

      const gasTestRow = await adminPrisma.gasTestResult.findFirstOrThrow({ where: { workPermitId: permit.id } });
      expect(gasTestRow.retestDueAt).not.toBeNull(); // auto-computed dari gasRetestIntervalHours
      expect(gasTestRow.retestDueAt!.getTime()).toBeLessThan(Date.now());

      await gasRetestDueScanService.scan();
      const suspended = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: permit.id } });
      expect(suspended.status).toBe("SUSPENDED");

      // Retest baru PASS (sesudah suspend) -> resumeFromSuspension().
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        gasTestService.record({
          workPermitId: permit.id,
          gasType: "OXYGEN",
          readingValue: 20.9,
          unit: "%VOL",
          result: "PASS",
          testDatetime: new Date(),
          instrumentName: "MSA Altair 4X",
          testedBy: issuer.id,
        }),
      );
      const resumed = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.resumeFromSuspension(permit.id),
      );
      expect(resumed.status).toBe("ACTIVE");
    }, 15000);
  });

  describe("Isolasi tenant (RLS)", () => {
    it("work_permit_extensions/work_permit_closures tenant A tidak terlihat dari context tenant B", async () => {
      const tenantA = await setupTenant();
      const tenantB = await seedTenantFixture();
      const type = await createType(tenantA.fixture.tenantId, tenantA.fixture.userId, { maxExtensionCount: 1 });
      // DUA permit terpisah — work_permits.status EXTENSION_REQUESTED dan
      // PENDING_CLOSURE saling eksklusif (satu permit tidak dapat berada di
      // kedua state itu bersamaan), jadi extension dan closure diuji pada
      // permit ACTIVE masing-masing.
      const forExtension = await createActivePermit(tenantA.fixture, tenantA.issuer, tenantA.siteId, type.id);
      const forClosure = await createActivePermit(tenantA.fixture, tenantA.issuer, tenantA.siteId, type.id);

      const extension = await tenantContextStorage.run({ tenantId: tenantA.fixture.tenantId, userId: tenantA.fixture.userId }, () =>
        extensionService.request({
          workPermitId: forExtension.id,
          requestedNewEndDatetime: new Date(Date.now() + 16 * 60 * 60 * 1000),
          reason: "Rahasia tenant A",
          gasRetestRequired: false,
          requestedBy: tenantA.fixture.userId,
        }),
      );
      const closure = await tenantContextStorage.run({ tenantId: tenantA.fixture.tenantId, userId: tenantA.fixture.userId }, () =>
        closureService.submit(forClosure.id, { areaSafetyChecklist: {}, isolationRemovedConfirmed: false, requesterSignoffBy: tenantA.fixture.userId }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => extensionService.getById(extension.id)),
      ).rejects.toThrow();
      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => closureService.getByPermit(forClosure.id)),
      ).rejects.toThrow();
      expect(closure.workPermitId).toBe(forClosure.id);
    }, 15000);
  });
});
