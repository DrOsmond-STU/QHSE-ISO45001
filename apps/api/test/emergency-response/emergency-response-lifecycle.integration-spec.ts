import { INestApplication } from "@nestjs/common";
import { seedEmergencyResponseNotificationTemplates } from "../../prisma/seed-emergency-response-notification-templates";
import { EmergencyActivationService } from "../../src/modules/domains/emergency-response/emergency-activation.service";
import { EmergencyDrillService } from "../../src/modules/domains/emergency-response/emergency-drill.service";
import { EmergencyEquipmentReadinessChecklistService } from "../../src/modules/domains/emergency-response/emergency-equipment-readiness-checklist.service";
import { EmergencyMusterPointService } from "../../src/modules/domains/emergency-response/emergency-muster-point.service";
import { EmergencyPlanReviewOverdueScanService } from "../../src/modules/domains/emergency-response/emergency-plan-review-overdue-scan.service";
import { EmergencyResponsePlanService } from "../../src/modules/domains/emergency-response/emergency-response-plan.service";
import { EmergencyResponseTeamService } from "../../src/modules/domains/emergency-response/emergency-response-team.service";
import { MusterPointCheckinService } from "../../src/modules/domains/emergency-response/muster-point-checkin.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

/**
 * Task 3.7 (Modul 14 Emergency Response) — cakupan: lifecycle plan penuh
 * dgn KELIMA JSON Logic conditional workflow di codebase ini (severityLevel
 * LEVEL_1_LOCAL 1-stage vs LEVEL_2/3 2-stage), BR-01 (review overdue scan),
 * BR-03 (Incident Commander unik per tim aktif), BR-04+BR-08 (gate
 * COMPLETED drill), BR-05+BR-07 (checkin server-stamped + estimasi missing
 * person), BR-06 (eskalasi real-time equipment OUT_OF_SERVICE), DAN
 * acceptance criterion literal TASK_INSTRUCTION.md 3.7 — broadcast
 * notifikasi prioritas CRITICAL saat aktivasi REAL_EMERGENCY, isolasi
 * tenant RLS.
 */
describe("Emergency Response — Modul 14 (task 3.7)", () => {
  let app: INestApplication;
  let planService: EmergencyResponsePlanService;
  let musterPointService: EmergencyMusterPointService;
  let teamService: EmergencyResponseTeamService;
  let drillService: EmergencyDrillService;
  let activationService: EmergencyActivationService;
  let checkinService: MusterPointCheckinService;
  let readinessService: EmergencyEquipmentReadinessChecklistService;
  let reviewOverdueScanService: EmergencyPlanReviewOverdueScanService;
  let workflowEngineService: WorkflowEngineService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    planService = app.get(EmergencyResponsePlanService);
    musterPointService = app.get(EmergencyMusterPointService);
    teamService = app.get(EmergencyResponseTeamService);
    drillService = app.get(EmergencyDrillService);
    activationService = app.get(EmergencyActivationService);
    checkinService = app.get(MusterPointCheckinService);
    readinessService = app.get(EmergencyEquipmentReadinessChecklistService);
    reviewOverdueScanService = app.get(EmergencyPlanReviewOverdueScanService);
    workflowEngineService = app.get(WorkflowEngineService);
    await seedEmergencyResponseNotificationTemplates(adminPrisma);
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
    const tenantAdmin = await seedUserInTenant(fixture.tenantId, "Tenant Admin");
    await assignRole(fixture.tenantId, tenantAdmin.id, "TENANT_ADMIN");
    const { companyId, siteId } = await seedSite(fixture.tenantId, fixture.userId);
    return { fixture, hseManager, hseOfficer, tenantAdmin, companyId, siteId };
  }

  async function pendingTaskFor(instanceId: string) {
    return adminPrisma.workflowTask.findFirstOrThrow({ where: { instanceId, status: "PENDING" } });
  }

  describe("Lifecycle plan — KELIMA JSON Logic conditional workflow (severityLevel)", () => {
    it("LEVEL_1_LOCAL -> 1-stage (langsung APPROVED_ACTIVE setelah Stage 1)", async () => {
      const { fixture, hseManager, hseOfficer, companyId, siteId } = await setupTenant();
      const ctxOfficer = { tenantId: fixture.tenantId, userId: hseOfficer.id };
      const ctxManager = { tenantId: fixture.tenantId, userId: hseManager.id };

      const plan = await tenantContextStorage.run(ctxOfficer, () =>
        planService.create({
          companyId,
          siteId,
          planTitle: "SOP Kebakaran Gudang A",
          emergencyType: "FIRE",
          scenarioDescription: "Kebakaran area gudang bahan mudah terbakar",
          severityLevel: "LEVEL_1_LOCAL",
          steps: [{ sequenceNo: 1, stepDescription: "Aktifkan alarm", responsibleErtRole: "FIRE_WARDEN" }],
        }),
      );
      expect(plan.status).toBe("DRAFT");
      expect(plan.planNumber).toContain("ERP");
      expect(plan.planNumber).toMatch(/001$/);

      const submitted = await tenantContextStorage.run(ctxOfficer, () => planService.submitForApproval(plan.id));
      expect(submitted.status).toBe("UNDER_REVIEW");
      expect(submitted.workflowInstanceId).not.toBeNull();

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      expect(task1.assignedTo).toBe(hseManager.id);
      await tenantContextStorage.run(ctxManager, () => workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, hseManager.id));
      await new Promise((r) => setTimeout(r, 300));

      const instance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instance.status).toBe("APPROVED");
      const allTasks = await adminPrisma.workflowTask.findMany({ where: { instanceId: instance.id } });
      expect(allTasks).toHaveLength(1);

      const planAfter = await adminPrisma.emergencyResponsePlan.findUniqueOrThrow({ where: { id: plan.id } });
      expect(planAfter.status).toBe("APPROVED_ACTIVE");
      expect(planAfter.nextReviewDueDate).not.toBeNull();
      expect(planAfter.lastReviewedDate).not.toBeNull();
    }, 20000);

    it("LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY -> 2-stage (Stage 2 kondisional terpicu)", async () => {
      const { fixture, hseManager, hseOfficer, companyId, siteId } = await setupTenant();
      const ctxOfficer = { tenantId: fixture.tenantId, userId: hseOfficer.id };
      const ctxManager = { tenantId: fixture.tenantId, userId: hseManager.id };

      const plan = await tenantContextStorage.run(ctxOfficer, () =>
        planService.create({
          companyId,
          siteId,
          planTitle: "SOP Ledakan Fasilitas Migas",
          emergencyType: "EXPLOSION",
          scenarioDescription: "Ledakan pada fasilitas produksi",
          severityLevel: "LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY",
          steps: [],
        }),
      );
      const submitted = await tenantContextStorage.run(ctxOfficer, () => planService.submitForApproval(plan.id));

      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run(ctxManager, () => workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, hseManager.id));

      const instanceMid = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instanceMid.status).toBe("IN_PROGRESS");
      const task2 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run(ctxManager, () => workflowEngineService.actOnTask(task2.id, "APPROVE", undefined, hseManager.id));
      await new Promise((r) => setTimeout(r, 300));

      const instance = await adminPrisma.workflowInstance.findUniqueOrThrow({ where: { id: submitted.workflowInstanceId! } });
      expect(instance.status).toBe("APPROVED");
      const planAfter = await adminPrisma.emergencyResponsePlan.findUniqueOrThrow({ where: { id: plan.id } });
      expect(planAfter.status).toBe("APPROVED_ACTIVE");
    }, 20000);

    it("REJECTED -> plan kembali DRAFT, workflow_instance_id di-null-kan", async () => {
      const { fixture, hseManager, hseOfficer, companyId, siteId } = await setupTenant();
      const ctxOfficer = { tenantId: fixture.tenantId, userId: hseOfficer.id };
      const ctxManager = { tenantId: fixture.tenantId, userId: hseManager.id };

      const plan = await tenantContextStorage.run(ctxOfficer, () =>
        planService.create({
          companyId,
          siteId,
          planTitle: "SOP Gempa",
          emergencyType: "EARTHQUAKE",
          scenarioDescription: "Gempa bumi",
          severityLevel: "LEVEL_1_LOCAL",
          steps: [],
        }),
      );
      const submitted = await tenantContextStorage.run(ctxOfficer, () => planService.submitForApproval(plan.id));
      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run(ctxManager, () =>
        workflowEngineService.actOnTask(task1.id, "REJECT", "Langkah SOP kurang detail", hseManager.id),
      );
      await new Promise((r) => setTimeout(r, 300));

      const planAfter = await adminPrisma.emergencyResponsePlan.findUniqueOrThrow({ where: { id: plan.id } });
      expect(planAfter.status).toBe("DRAFT");
      expect(planAfter.workflowInstanceId).toBeNull();
    }, 15000);
  });

  describe("BR-01 — emergency-plan-review-overdue-scan", () => {
    it("next_review_due_date >30 hari terlewat -> notifikasi HSE Manager", async () => {
      const { fixture, hseManager, hseOfficer, companyId, siteId } = await setupTenant();
      const ctxOfficer = { tenantId: fixture.tenantId, userId: hseOfficer.id };
      const ctxManager = { tenantId: fixture.tenantId, userId: hseManager.id };

      const plan = await tenantContextStorage.run(ctxOfficer, () =>
        planService.create({
          companyId,
          siteId,
          planTitle: "SOP Tumpahan B3",
          emergencyType: "HAZMAT_SPILL",
          scenarioDescription: "Tumpahan bahan kimia",
          severityLevel: "LEVEL_1_LOCAL",
          steps: [],
        }),
      );
      const submitted = await tenantContextStorage.run(ctxOfficer, () => planService.submitForApproval(plan.id));
      const task1 = await pendingTaskFor(submitted.workflowInstanceId!);
      await tenantContextStorage.run(ctxManager, () => workflowEngineService.actOnTask(task1.id, "APPROVE", undefined, hseManager.id));
      await new Promise((r) => setTimeout(r, 300));

      const overdueDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      await adminPrisma.emergencyResponsePlan.update({ where: { id: plan.id }, data: { nextReviewDueDate: overdueDate } });

      await reviewOverdueScanService.scan();

      const notifs = await adminPrisma.notification.findMany({ where: { entityId: plan.id, eventType: "EMERGENCY_PLAN_REVIEW_OVERDUE" } });
      expect(notifs.map((n) => n.recipientUserId)).toEqual([hseManager.id]);
    }, 20000);
  });

  describe("BR-03 — Incident Commander unik per tim aktif", () => {
    it("menolak Incident Commander kedua (non-backup), mengizinkan sbg backup eksplisit", async () => {
      const { fixture, hseOfficer, siteId } = await setupTenant();
      const ctx = { tenantId: fixture.tenantId, userId: hseOfficer.id };
      const memberA = await seedUserInTenant(fixture.tenantId, "Calon IC A", { siteId });
      const memberB = await seedUserInTenant(fixture.tenantId, "Calon IC B", { siteId });
      const memberC = await seedUserInTenant(fixture.tenantId, "Backup IC", { siteId });

      const team = await tenantContextStorage.run(ctx, () =>
        teamService.create({ siteId, teamName: "ERT Site Utama", teamType: "SITE_WIDE", effectiveDate: new Date() }),
      );
      const firstIc = await tenantContextStorage.run(ctx, () =>
        teamService.addMember(team.id, { userId: memberA.id, ertRole: "INCIDENT_COMMANDER", assignedDate: new Date() }),
      );

      await expect(
        tenantContextStorage.run(ctx, () =>
          teamService.addMember(team.id, { userId: memberB.id, ertRole: "INCIDENT_COMMANDER", assignedDate: new Date() }),
        ),
      ).rejects.toThrow(/BR-03/);

      await expect(
        tenantContextStorage.run(ctx, () =>
          teamService.addMember(team.id, {
            userId: memberC.id,
            ertRole: "INCIDENT_COMMANDER",
            backupForMemberId: firstIc.id,
            assignedDate: new Date(),
          }),
        ),
      ).resolves.toBeDefined();
    }, 15000);
  });

  describe("BR-04/BR-08 — gate COMPLETED emergency_drills", () => {
    it("FULL_SCALE_EVACUATION tanpa activation ditolak (BR-04), lolos setelah activation dibuat", async () => {
      const { fixture, hseManager, hseOfficer, companyId, siteId } = await setupTenant();
      const ctxOfficer = { tenantId: fixture.tenantId, userId: hseOfficer.id };

      const plan = await tenantContextStorage.run(ctxOfficer, () =>
        planService.create({
          companyId,
          siteId,
          planTitle: "SOP Evakuasi Penuh",
          emergencyType: "FIRE",
          scenarioDescription: "Evakuasi skala penuh",
          severityLevel: "LEVEL_1_LOCAL",
          steps: [],
        }),
      );
      const drill = await tenantContextStorage.run(ctxOfficer, () =>
        drillService.create({
          siteId,
          emergencyResponsePlanId: plan.id,
          drillType: "FULL_SCALE_EVACUATION",
          scheduledDate: new Date(),
          conductedBy: hseOfficer.id,
        }),
      );
      await tenantContextStorage.run(ctxOfficer, () => drillService.start(drill.id));

      await expect(tenantContextStorage.run(ctxOfficer, () => drillService.complete(drill.id, {}))).rejects.toThrow(/BR-04/);

      await tenantContextStorage.run(ctxOfficer, () =>
        activationService.declare({ siteId, emergencyResponsePlanId: plan.id, triggerContext: "DRILL", relatedEmergencyDrillId: drill.id, emergencyType: "FIRE" }),
      );

      const completed = await tenantContextStorage.run(ctxOfficer, () => drillService.complete(drill.id, {}));
      expect(completed.status).toBe("COMPLETED");
    }, 20000);

    it("BR-08 — gaps_identified tanpa capa_id ditolak, lolos setelah capa_id diisi", async () => {
      const { fixture, hseOfficer, companyId, siteId } = await setupTenant();
      const ctxOfficer = { tenantId: fixture.tenantId, userId: hseOfficer.id };

      const plan = await tenantContextStorage.run(ctxOfficer, () =>
        planService.create({
          companyId,
          siteId,
          planTitle: "SOP Tabletop",
          emergencyType: "MEDICAL_EMERGENCY",
          scenarioDescription: "Simulasi meja",
          severityLevel: "LEVEL_1_LOCAL",
          steps: [],
        }),
      );
      const drill = await tenantContextStorage.run(ctxOfficer, () =>
        drillService.create({ siteId, emergencyResponsePlanId: plan.id, drillType: "TABLETOP", scheduledDate: new Date(), conductedBy: hseOfficer.id }),
      );
      await tenantContextStorage.run(ctxOfficer, () => drillService.start(drill.id));

      await expect(
        tenantContextStorage.run(ctxOfficer, () => drillService.complete(drill.id, { gapsIdentified: "Waktu respon P3K terlalu lama" })),
      ).rejects.toThrow(/BR-08/);

      const completed = await tenantContextStorage.run(ctxOfficer, () =>
        drillService.complete(drill.id, { gapsIdentified: "Waktu respon P3K terlalu lama", capaId: "11111111-1111-1111-1111-111111111111" }),
      );
      expect(completed.status).toBe("COMPLETED");
      expect(completed.capaId).toBe("11111111-1111-1111-1111-111111111111");
    }, 20000);

    it("recordParticipation() — actual_participant_count HANYA menghitung PRESENT", async () => {
      const { fixture, hseOfficer, companyId, siteId } = await setupTenant();
      const ctxOfficer = { tenantId: fixture.tenantId, userId: hseOfficer.id };
      const plan = await tenantContextStorage.run(ctxOfficer, () =>
        planService.create({ companyId, siteId, planTitle: "SOP Partisipasi", emergencyType: "FLOOD", scenarioDescription: "Banjir", severityLevel: "LEVEL_1_LOCAL", steps: [] }),
      );
      const drill = await tenantContextStorage.run(ctxOfficer, () =>
        drillService.create({ siteId, emergencyResponsePlanId: plan.id, drillType: "FUNCTIONAL", scheduledDate: new Date(), conductedBy: hseOfficer.id }),
      );
      await tenantContextStorage.run(ctxOfficer, () =>
        drillService.recordParticipation(drill.id, { participantName: "Budi", participantType: "EMPLOYEE", attendanceStatus: "PRESENT" }),
      );
      await tenantContextStorage.run(ctxOfficer, () =>
        drillService.recordParticipation(drill.id, { participantName: "Siti", participantType: "EMPLOYEE", attendanceStatus: "ABSENT" }),
      );
      await tenantContextStorage.run(ctxOfficer, () =>
        drillService.recordParticipation(drill.id, { participantName: "Andi", participantType: "CONTRACTOR", attendanceStatus: "PRESENT" }),
      );

      const drillAfter = await adminPrisma.emergencyDrill.findUniqueOrThrow({ where: { id: drill.id } });
      expect(drillAfter.actualParticipantCount).toBe(2);
    }, 15000);
  });

  describe("Aktivasi darurat — broadcast prioritas CRITICAL (acceptance criterion 3.7) + BR-05/BR-07", () => {
    it("REAL_EMERGENCY memicu notifikasi HANYA ke karyawan/kontraktor site terkait + HSE Manager + Tenant Admin (BUKAN visitor, BUKAN user site lain)", async () => {
      const { fixture, hseManager, tenantAdmin, siteId } = await setupTenant();
      const employee = await seedUserInTenant(fixture.tenantId, "Karyawan Site", { siteId, userType: "INTERNAL_EMPLOYEE" });
      const contractor = await seedUserInTenant(fixture.tenantId, "Kontraktor Site", { siteId, userType: "CONTRACTOR" });
      const visitor = await seedUserInTenant(fixture.tenantId, "Visitor Site", { siteId, userType: "VISITOR" });
      const { siteId: otherSiteId } = await seedSite(fixture.tenantId, fixture.userId);
      const otherSiteEmployee = await seedUserInTenant(fixture.tenantId, "Karyawan Site Lain", { siteId: otherSiteId, userType: "INTERNAL_EMPLOYEE" });

      const ctxEmployee = { tenantId: fixture.tenantId, userId: employee.id };
      const activation = await tenantContextStorage.run(ctxEmployee, () =>
        activationService.declare({ siteId, triggerContext: "REAL_EMERGENCY", emergencyType: "FIRE", totalExpectedHeadcount: 3 }),
      );

      const notifs = await adminPrisma.notification.findMany({
        where: { entityId: activation.id, eventType: "EMERGENCY_REAL_ACTIVATION_DECLARED" },
      });
      const recipientIds = notifs.map((n) => n.recipientUserId).sort();
      const expected = [employee.id, contractor.id, hseManager.id, tenantAdmin.id].sort();
      expect(recipientIds).toEqual(expected);
      expect(recipientIds).not.toContain(visitor.id);
      expect(recipientIds).not.toContain(otherSiteEmployee.id);
      expect(notifs.every((n) => n.priority === "CRITICAL")).toBe(true);
    }, 20000);

    it("trigger_context=DRILL TIDAK memicu broadcast sama sekali", async () => {
      const { fixture, hseOfficer, siteId } = await setupTenant();
      const ctxOfficer = { tenantId: fixture.tenantId, userId: hseOfficer.id };
      const activation = await tenantContextStorage.run(ctxOfficer, () =>
        activationService.declare({ siteId, triggerContext: "DRILL", emergencyType: "FIRE" }),
      );
      const notifs = await adminPrisma.notification.findMany({
        where: { entityId: activation.id, eventType: "EMERGENCY_REAL_ACTIVATION_DECLARED" },
      });
      expect(notifs).toHaveLength(0);
    }, 15000);

    it("BR-05 (checkin server-stamped + marshal wajib recorded_by) + BR-07 (missing_person_count estimasi) + markAllClear", async () => {
      const { fixture, hseOfficer, siteId } = await setupTenant();
      const ctxOfficer = { tenantId: fixture.tenantId, userId: hseOfficer.id };
      const employee = await seedUserInTenant(fixture.tenantId, "Peserta Checkin", { siteId, userType: "INTERNAL_EMPLOYEE" });
      const ctxEmployee = { tenantId: fixture.tenantId, userId: employee.id };
      const marshal = await seedUserInTenant(fixture.tenantId, "Marshal", { siteId });
      const ctxMarshal = { tenantId: fixture.tenantId, userId: marshal.id };

      const musterPoint = await tenantContextStorage.run(ctxOfficer, () =>
        musterPointService.create({ siteId, musterPointCode: "MP-01", musterPointName: "Titik Kumpul Utama" }),
      );
      const activation = await tenantContextStorage.run(ctxOfficer, () =>
        activationService.declare({ siteId, triggerContext: "REAL_EMERGENCY", emergencyType: "EARTHQUAKE", totalExpectedHeadcount: 5 }),
      );

      const beforeCheckin = Date.now();
      const selfCheckin = await tenantContextStorage.run(ctxEmployee, () =>
        checkinService.selfCheckin({ siteId, musterPointId: musterPoint.id, emergencyActivationId: activation.id }),
      );
      expect(selfCheckin.checkinMethod).toBe("SELF_APP_CHECKIN");
      expect(selfCheckin.checkinTimestamp.getTime()).toBeGreaterThanOrEqual(beforeCheckin);
      expect(selfCheckin.checkinPersonType).toBe("EMPLOYEE");

      const marshalCheckin = await tenantContextStorage.run(ctxMarshal, () =>
        checkinService.marshalCheckin({ siteId, musterPointId: musterPoint.id, emergencyActivationId: activation.id, checkinPersonName: "Kontraktor Tanpa Akun", checkinPersonType: "CONTRACTOR" }),
      );
      expect(marshalCheckin.checkinMethod).toBe("MARSHAL_MANUAL_ENTRY");
      expect(marshalCheckin.recordedBy).toBe(marshal.id);

      const progress = await tenantContextStorage.run(ctxOfficer, () => activationService.getWithProgress(activation.id));
      expect(progress.totalCheckedInCount).toBe(2);
      expect(progress.missingPersonCount).toBe(3); // 5 expected - 2 checked in

      const allClear = await tenantContextStorage.run(ctxOfficer, () => activationService.markAllClear(activation.id));
      expect(allClear.status).toBe("ALL_CLEAR_DECLARED");
      expect(allClear.allClearDatetime).not.toBeNull();
    }, 20000);
  });

  describe("BR-06 — eskalasi real-time equipment OUT_OF_SERVICE", () => {
    it("readiness_status=OUT_OF_SERVICE memicu notifikasi SEGERA (bukan scan) ke HSE Manager; READY tidak", async () => {
      const { fixture, hseManager, hseOfficer, siteId } = await setupTenant();
      const ctxOfficer = { tenantId: fixture.tenantId, userId: hseOfficer.id };
      const assetId = "22222222-2222-2222-2222-222222222222";

      const readyChecklist = await tenantContextStorage.run(ctxOfficer, () =>
        readinessService.create({ siteId, assetId, inspectionDate: new Date(), readinessStatus: "READY" }),
      );
      const noNotifs = await adminPrisma.notification.findMany({ where: { entityId: readyChecklist.id } });
      expect(noNotifs).toHaveLength(0);

      const oosChecklist = await tenantContextStorage.run(ctxOfficer, () =>
        readinessService.create({ siteId, assetId, inspectionDate: new Date(), readinessStatus: "OUT_OF_SERVICE", issueDescription: "APAR kosong" }),
      );
      const notifs = await adminPrisma.notification.findMany({ where: { entityId: oosChecklist.id, eventType: "EMERGENCY_EQUIPMENT_OUT_OF_SERVICE" } });
      expect(notifs.map((n) => n.recipientUserId)).toEqual([hseManager.id]);
      expect(notifs[0].priority).toBe("HIGH");
    }, 15000);
  });

  describe("Isolasi tenant (RLS)", () => {
    it("emergency_response_plans/emergency_muster_points tenant A tidak terlihat dari context tenant B", async () => {
      const tenantA = await setupTenant();
      const tenantB = await seedTenantFixture();
      const ctxA = { tenantId: tenantA.fixture.tenantId, userId: tenantA.hseOfficer.id };

      const musterPoint = await tenantContextStorage.run(ctxA, () =>
        musterPointService.create({ siteId: tenantA.siteId, musterPointCode: "MP-RLS", musterPointName: "Rahasia Tenant A" }),
      );
      const plan = await tenantContextStorage.run(ctxA, () =>
        planService.create({
          companyId: tenantA.companyId,
          siteId: tenantA.siteId,
          planTitle: "Rahasia Tenant A",
          emergencyType: "FIRE",
          scenarioDescription: "Rahasia",
          severityLevel: "LEVEL_1_LOCAL",
          steps: [],
        }),
      );

      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => musterPointService.getById(musterPoint.id)),
      ).rejects.toThrow();
      await expect(
        tenantContextStorage.run({ tenantId: tenantB.tenantId, userId: tenantB.userId }, () => planService.getById(plan.id)),
      ).rejects.toThrow();
    }, 15000);
  });
});
