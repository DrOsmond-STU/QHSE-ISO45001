import { BadRequestException, INestApplication } from "@nestjs/common";
import { seedWorkPermitNotificationTemplates } from "../../prisma/seed-work-permit-notification-templates";
import { GasTestResultService } from "../../src/modules/domains/work-permit/gas-test-result.service";
import { IsolationLotoRecordService } from "../../src/modules/domains/work-permit/isolation-loto-record.service";
import { WorkPermitApprovalCacheService } from "../../src/modules/domains/work-permit/work-permit-approval-cache.service";
import { WorkPermitTypeService } from "../../src/modules/domains/work-permit/work-permit-type.service";
import { WorkPermitService } from "../../src/modules/domains/work-permit/work-permit.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

/**
 * Task 3.3 (Modul 06 Work Permit Management — tipe & alur inti) —
 * cakupan: BR-01 (permit_number sebelum keluar DRAFT), BR-02 (gas test
 * PASS sebelum ACTIVE), BR-03 (LOTO seluruhnya VERIFIED + verifier≠applier
 * sebelum ACTIVE), BR-04 (percabangan kondisional Stage 2 HSE — risk_level=
 * HIGH ATAU requires_hse_approval, JSA Logic condition KEDUA di codebase
 * setelah HIRA 3.2), BR-09 (segregation of duty requester≠approver),
 * numbering scope_level=SITE (counter genuinely terpisah per site,
 * PERTAMA di codebase — beda dari HIRA/JSA/HIRADC/RISK_CORP scope_level=
 * TENANT), work_permit_approvals cache read-model, isolasi tenant RLS.
 */
describe("Work Permit Management — Modul 06 (task 3.3)", () => {
  let app: INestApplication;
  let typeService: WorkPermitTypeService;
  let permitService: WorkPermitService;
  let gasTestService: GasTestResultService;
  let lotoService: IsolationLotoRecordService;
  let approvalCacheService: WorkPermitApprovalCacheService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    typeService = app.get(WorkPermitTypeService);
    permitService = app.get(WorkPermitService);
    gasTestService = app.get(GasTestResultService);
    lotoService = app.get(IsolationLotoRecordService);
    approvalCacheService = app.get(WorkPermitApprovalCacheService);
    await seedWorkPermitNotificationTemplates(adminPrisma);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  /** Satu tenant lengkap: actor (Requester) + Issuer (SUPERVISOR, stage 1
   * SELALU) + HSE Manager (HSE_MANAGER, stage 2 kondisional BR-04) + site. */
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
    overrides: { requiresGasTest?: boolean; requiresLoto?: boolean; requiresHseApproval?: boolean; defaultRiskLevel?: "LOW" | "MEDIUM" | "HIGH" } = {},
  ) {
    return tenantContextStorage.run({ tenantId, userId }, () =>
      typeService.create({
        code: `TYPE-${Math.random().toString(36).slice(2, 8)}`,
        name: "Hot Work",
        requiresGasTest: overrides.requiresGasTest ?? false,
        requiresLoto: overrides.requiresLoto ?? false,
        requiresHseApproval: overrides.requiresHseApproval ?? false,
        defaultRiskLevel: overrides.defaultRiskLevel ?? "LOW",
      }),
    );
  }

  async function pendingTaskFor(instanceId: string) {
    return adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId, status: "PENDING" } });
  }

  describe("Alur PTW TANPA Stage 2 HSE (risk_level bukan HIGH, requires_hse_approval=false)", () => {
    it("create -> checklist -> submit -> Issuer approve -> APPROVED -> activate -> ACTIVE (tanpa gas test/LOTO)", async () => {
      const { fixture, issuer, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { defaultRiskLevel: "LOW" });

      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Ganti lampu gudang",
          description: "Penggantian lampu LED area gudang",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      expect(permit.status).toBe("DRAFT");
      expect(permit.permitNumber).toContain("WP");
      expect(permit.riskLevel).toBe("LOW");

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.submitHazardChecklist(permit.id, { customFields: { apd: "helm+sarung tangan" }, allMandatoryItemsChecked: true }),
      );

      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.submitForApproval(permit.id));
      expect(submitted.status).toBe("PENDING_ISSUER_APPROVAL");
      expect(submitted.workflowInstanceId).not.toBeNull();

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task1.assignedTo).toBe(issuer.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: issuer.id }, () =>
        permitService.actOnApprovalTask(task1.id, "APPROVE", undefined, issuer.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const instance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instance.status).toBe("APPROVED");
      const allTasks = await adminPrisma.workflowTask.findMany({ where: { instanceId: instance.id } });
      expect(allTasks).toHaveLength(1);

      const afterApproval = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: permit.id } });
      expect(afterApproval.status).toBe("APPROVED");

      const cache = await adminPrisma.workPermitApproval.findUniqueOrThrow({ where: { workPermitId: permit.id } });
      expect(cache.finalDecision).toBe("APPROVED");
      expect(cache.issuerApprovedBy).toBe(issuer.id);
      expect(cache.hseApprovedBy).toBeNull();

      const activated = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.activate(permit.id));
      expect(activated.status).toBe("ACTIVE");
      expect(activated.actualStartDatetime).not.toBeNull();
    }, 15000);

    it("reject di Stage 1 -> REJECTED (terminal)", async () => {
      const { fixture, issuer, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId);
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Uji reject",
          description: "Uji",
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
        permitService.actOnApprovalTask(task1.id, "REJECT", "Lokasi belum siap", issuer.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const afterReject = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: permit.id } });
      expect(afterReject.status).toBe("REJECTED");
      const cache = await adminPrisma.workPermitApproval.findUniqueOrThrow({ where: { workPermitId: permit.id } });
      expect(cache.finalDecision).toBe("REJECTED");
    }, 15000);

    it("submitForApproval() menolak kalau checklist belum lengkap (allMandatoryItemsChecked=false)", async () => {
      const { fixture, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId);
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Checklist belum lengkap",
          description: "Uji",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.submitForApproval(permit.id)),
      ).rejects.toThrow(BadRequestException);

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.submitHazardChecklist(permit.id, { customFields: {}, allMandatoryItemsChecked: false }),
      );
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.submitForApproval(permit.id)),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("BR-04 — percabangan kondisional Stage 2 HSE (JSON Logic condition KEDUA di codebase)", () => {
    it("risk_level=HIGH memicu Stage 2 HSE, TIDAK PERNAH terminal setelah Issuer saja", async () => {
      const { fixture, issuer, hseManager, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { defaultRiskLevel: "HIGH" });
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Hot work area proses aktif",
          description: "Pengelasan dekat pipa proses",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      expect(permit.riskLevel).toBe("HIGH");
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.submitHazardChecklist(permit.id, { customFields: {}, allMandatoryItemsChecked: true }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.submitForApproval(permit.id));

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: issuer.id }, () =>
        permitService.actOnApprovalTask(task1.id, "APPROVE", undefined, issuer.id),
      );

      const instanceMid = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instanceMid.status).toBe("IN_PROGRESS");
      const permitMid = await adminPrisma.workPermit.findUniqueOrThrow({ where: { id: permit.id } });
      expect(permitMid.status).toBe("PENDING_ISSUER_APPROVAL"); // status kolom BELUM diubah listener (belum terminal)

      const cacheMid = await adminPrisma.workPermitApproval.findUniqueOrThrow({ where: { workPermitId: permit.id } });
      expect(cacheMid.issuerApprovedBy).toBe(issuer.id);
      expect(cacheMid.finalDecision).toBe("PENDING");
      expect(cacheMid.currentStageName).toContain("HSE");

      const task2 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task2.assignedTo).toBe(hseManager.id);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: hseManager.id }, () =>
        permitService.actOnApprovalTask(task2.id, "APPROVE", undefined, hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const instance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instance.status).toBe("APPROVED");
      const allTasks = await adminPrisma.workflowTask.findMany({ where: { instanceId: instance.id } });
      expect(allTasks).toHaveLength(2);

      const cache = await adminPrisma.workPermitApproval.findUniqueOrThrow({ where: { workPermitId: permit.id } });
      expect(cache.hseApprovedBy).toBe(hseManager.id);
      expect(cache.finalDecision).toBe("APPROVED");
    }, 15000);

    it("requires_hse_approval=true (BUKAN risk_level=HIGH) JUGA memicu Stage 2", async () => {
      const { fixture, issuer, hseManager, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { defaultRiskLevel: "LOW", requiresHseApproval: true });
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Confined space rutin tapi tipe wajib HSE",
          description: "Uji BR-04 jalur requires_hse_approval",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      expect(permit.riskLevel).toBe("LOW");
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.submitHazardChecklist(permit.id, { customFields: {}, allMandatoryItemsChecked: true }),
      );
      const submitted = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.submitForApproval(permit.id));

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: issuer.id }, () =>
        permitService.actOnApprovalTask(task1.id, "APPROVE", undefined, issuer.id),
      );
      const task2 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task2.assignedTo).toBe(hseManager.id);
    });

    it("risk_level=MEDIUM DAN requires_hse_approval=false -> 1 stage saja, terminal langsung", async () => {
      const { fixture, issuer, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { defaultRiskLevel: "MEDIUM", requiresHseApproval: false });
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Uji tanpa HSE stage",
          description: "Uji",
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

      const instance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instance.status).toBe("APPROVED");
      const allTasks = await adminPrisma.workflowTask.findMany({ where: { instanceId: instance.id } });
      expect(allTasks).toHaveLength(1);
    }, 15000);
  });

  describe("BR-09 — segregation of duty (requester tidak boleh approve permit miliknya sendiri)", () => {
    it("actOnApprovalTask() menolak kalau actingUserId sama dengan requesterId", async () => {
      // SENGAJA TIDAK pakai setupTenant() (helper itu sudah membuat user
      // "Issuer" TERPISAH ber-role SUPERVISOR — ROLE_IN_SCOPE tenant-wide
      // akan meresolusi KEDUA supervisor jadi 2 workflow_tasks kalau
      // requester JUGA didaftarkan SUPERVISOR di tenant yang sama, bikin
      // pendingTaskFor() ambigu). Setup minimal sendiri di sini: requester
      // adalah SATU-SATUNYA pemegang role SUPERVISOR di tenant ini (site
      // kecil, 1 orang rangkap jabatan — skenario literal BR-09).
      const fixture = await seedTenantFixture();
      await assignRole(fixture.tenantId, fixture.userId, "SUPERVISOR");
      const { siteId } = await seedSite(fixture.tenantId, fixture.userId);

      const type = await createType(fixture.tenantId, fixture.userId);
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Uji BR-09",
          description: "Requester = approver",
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

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
          permitService.actOnApprovalTask(task1.id, "APPROVE", undefined, fixture.userId),
        ),
      ).rejects.toThrow();

      // Task TETAP PENDING (BR-09 gagal SEBELUM actOnTask() dipanggil).
      const stillPending = await adminPrisma.workflowTask.findUniqueOrThrow({ where: { id: task1.id } });
      expect(stillPending.status).toBe("PENDING");
    });
  });

  describe("BR-02 — gas test PASS wajib sebelum ACTIVE", () => {
    it("activate() ditolak tanpa gas test, ditolak dgn seluruh FAIL, diterima setelah ada 1 PASS", async () => {
      const { fixture, issuer, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { requiresGasTest: true });
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Confined space wajib gas test",
          description: "Uji BR-02",
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

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.activate(permit.id)),
      ).rejects.toThrow();

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        gasTestService.record({
          workPermitId: permit.id,
          gasType: "OXYGEN",
          readingValue: 15,
          unit: "%VOL",
          acceptableMin: 19.5,
          acceptableMax: 23.5,
          result: "FAIL",
          testDatetime: new Date(),
          instrumentName: "MSA Altair 4X",
          testedBy: issuer.id,
        }),
      );
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.activate(permit.id)),
      ).rejects.toThrow();

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        gasTestService.record({
          workPermitId: permit.id,
          gasType: "OXYGEN",
          readingValue: 20.9,
          unit: "%VOL",
          acceptableMin: 19.5,
          acceptableMax: 23.5,
          result: "PASS",
          testDatetime: new Date(),
          instrumentName: "MSA Altair 4X",
          testedBy: issuer.id,
        }),
      );
      const activated = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.activate(permit.id));
      expect(activated.status).toBe("ACTIVE");
    }, 15000);
  });

  describe("BR-03 — seluruh isolation_loto_records VERIFIED wajib sebelum ACTIVE (verifier≠applier)", () => {
    it("activate() ditolak tanpa LOTO record, ditolak selama status APPLIED, diterima setelah VERIFIED", async () => {
      const { fixture, issuer, hseManager, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId, { requiresLoto: true });
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Electrical isolation wajib LOTO",
          description: "Uji BR-03",
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

      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.activate(permit.id)),
      ).rejects.toThrow();

      const loto = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        lotoService.apply({
          workPermitId: permit.id,
          isolationPointDescription: "Panel MCC-01",
          isolationType: "ELECTRICAL",
          lockNumber: "LK-001",
          appliedBy: issuer.id,
          appliedAt: new Date(),
        }),
      );
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.activate(permit.id)),
      ).rejects.toThrow();

      // Prinsip verifikasi independen — verifiedBy SAMA dgn appliedBy ditolak.
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => lotoService.verify(loto.id, issuer.id)),
      ).rejects.toThrow(BadRequestException);

      await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => lotoService.verify(loto.id, hseManager.id));

      const activated = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.activate(permit.id));
      expect(activated.status).toBe("ACTIVE");
    }, 15000);
  });

  describe("cancel() dan korespondensi status", () => {
    it("DRAFT -> CANCELLED", async () => {
      const { fixture, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId);
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Uji cancel",
          description: "Uji",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      const cancelled = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => permitService.cancel(permit.id));
      expect(cancelled.status).toBe("CANCELLED");
    });
  });

  describe("Numbering scope_level=SITE — counter genuinely terpisah per site", () => {
    it("2 permit di site sama -> sequence 0001/0002; 1 permit di site lain -> sequence 0001 lagi (bukan 0003)", async () => {
      const { fixture, siteId: siteA } = await setupTenant();
      const { siteId: siteB } = await seedSite(fixture.tenantId, fixture.userId);
      const type = await createType(fixture.tenantId, fixture.userId);

      const permit1 = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId: siteA,
          title: "Permit A1",
          description: "Uji numbering",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      const permit2 = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId: siteA,
          title: "Permit A2",
          description: "Uji numbering",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      const permitOtherSite = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId: siteB,
          title: "Permit B1",
          description: "Uji numbering site lain",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );

      expect(permit1.permitNumber).toMatch(/0001$/);
      expect(permit2.permitNumber).toMatch(/0002$/);
      expect(permitOtherSite.permitNumber).toMatch(/0001$/);
      expect(permit1.permitNumber.split("/")[1]).not.toBe(permitOtherSite.permitNumber.split("/")[1]);
    });
  });

  describe("Isolasi tenant (RLS)", () => {
    it("work_permits/work_permit_types tenant A tidak terlihat dari context tenant B", async () => {
      const tenantA = await setupTenant();
      const tenantB = await seedTenantFixture();

      const type = await createType(tenantA.fixture.tenantId, tenantA.fixture.userId);
      const permit = await tenantContextStorage.run({ tenantId: tenantA.fixture.tenantId, userId: tenantA.fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId: tenantA.siteId,
          title: "Rahasia tenant A",
          description: "Uji RLS",
          requesterId: tenantA.fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => permitService.getById(permit.id)),
      ).rejects.toThrow();
      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => typeService.getById(type.id)),
      ).rejects.toThrow();
    });
  });

  describe("WorkPermitApprovalCacheService.refresh() — no-op aman", () => {
    it("tidak melempar utk permit yang belum pernah disubmit (workflowInstanceId null)", async () => {
      const { fixture, siteId } = await setupTenant();
      const type = await createType(fixture.tenantId, fixture.userId);
      const permit = await tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () =>
        permitService.create({
          workPermitTypeId: type.id,
          siteId,
          title: "Belum disubmit",
          description: "Uji refresh no-op",
          requesterId: fixture.userId,
          plannedStartDatetime: new Date(),
          plannedEndDatetime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        }),
      );
      await expect(
        tenantContextStorage.run({ tenantId: fixture.tenantId, userId: fixture.userId }, () => approvalCacheService.refresh(permit.id)),
      ).resolves.not.toThrow();
      const cache = await adminPrisma.workPermitApproval.findUnique({ where: { workPermitId: permit.id } });
      expect(cache).toBeNull();
    });
  });
});
