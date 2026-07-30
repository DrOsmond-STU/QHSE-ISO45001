import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { seedOccupationalHealthNotificationTemplates } from "../../prisma/seed-occupational-health-notification-templates";
import { CapaRegisterService } from "../../src/modules/domains/capa/capa-register.service";
import { ClinicVisitLogService } from "../../src/modules/domains/occupational-health/clinic-visit-log.service";
import { FitToWorkAssessmentService } from "../../src/modules/domains/occupational-health/fit-to-work-assessment.service";
import { HealthDataSubjectRequestService } from "../../src/modules/domains/occupational-health/health-data-subject-request.service";
import { HealthSurveillanceProgramService } from "../../src/modules/domains/occupational-health/health-surveillance-program.service";
import { McuReminderScanService } from "../../src/modules/domains/occupational-health/mcu-reminder-scan.service";
import { McuResultService } from "../../src/modules/domains/occupational-health/mcu-result.service";
import { McuScheduleService } from "../../src/modules/domains/occupational-health/mcu-schedule.service";
import { MedicalRecordService } from "../../src/modules/domains/occupational-health/medical-record.service";
import { OccupationalDiseaseCaseService } from "../../src/modules/domains/occupational-health/occupational-disease-case.service";
import { OccupationalHealthAuthorizedUserService } from "../../src/modules/domains/occupational-health/occupational-health-authorized-user.service";
import { OccupationalHealthReassessmentScanService } from "../../src/modules/domains/occupational-health/occupational-health-reassessment-scan.service";
import { RestrictedDutyAssignmentService } from "../../src/modules/domains/occupational-health/restricted-duty-assignment.service";
import { PrismaService } from "../../src/platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { WorkflowEngineService } from "../../src/platform/workflow-engine/workflow-engine.service";
import { adminPrisma, assignRole, createTestApp, flushTestRedis, grantPhiAuthorization, seedSite, seedTenantFixture, seedUserInTenant } from "./test-helpers";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Default 20s Jest pas-pasan utk suite ini — setupTenant() (7 user +
// RBAC seed masing-masing + PHI grant) jauh lebih berat drpd modul lain,
// terbukti empiris: di run penuh/kontensi, test yang timeout GANTI-GANTI
// (bukan satu test spesifik yang selalu gagal) — tanda beban dekat batas
// default, bukan deadlock. Naikkan default file ini drpd tambal per-test.
jest.setTimeout(60000);

/**
 * Task 5.3 (Modul 13 Occupational Health) — cakupan: BR-02 dual-gate
 * (whitelisted vs tidak, expired, revoked), BR-01 fail-closed access log +
 * immutability (REVOKE UPDATE/DELETE), BR-05 enkripsi field-level
 * (ciphertext mentah != plaintext, round-trip benar), BR-07 pre-employment
 * clearance readiness, BR-04 boundary field structural (getSummaryForSupervisor
 * TIDAK PERNAH membawa restrictionDetails), OH_PAK_CASE workflow 2-stage,
 * BR-08 eskalasi dual-notifikasi (agregat vs detail), BR-10 CAPA link
 * manual, BR-06 anonymization (eligible vs ditolak retensi), scan job
 * idempotency (mcu-reminder-scan, occupational-health-reassessment-scan),
 * alert keamanan PHI ditolak, isolasi tenant RLS.
 */
describe("Occupational Health — Modul 13 (task 5.3)", () => {
  let app: INestApplication;
  let medicalRecordService: MedicalRecordService;
  let mcuScheduleService: McuScheduleService;
  let mcuResultService: McuResultService;
  let mcuReminderScanService: McuReminderScanService;
  let fitToWorkAssessmentService: FitToWorkAssessmentService;
  let restrictedDutyAssignmentService: RestrictedDutyAssignmentService;
  let reassessmentScanService: OccupationalHealthReassessmentScanService;
  let pakCaseService: OccupationalDiseaseCaseService;
  let clinicVisitLogService: ClinicVisitLogService;
  let surveillanceProgramService: HealthSurveillanceProgramService;
  let authorizedUserService: OccupationalHealthAuthorizedUserService;
  let subjectRequestService: HealthDataSubjectRequestService;
  let capaRegisterService: CapaRegisterService;
  let workflowEngineService: WorkflowEngineService;
  let prisma: PrismaService;

  beforeAll(async () => {
    await flushTestRedis();
    app = await createTestApp();
    medicalRecordService = app.get(MedicalRecordService);
    mcuScheduleService = app.get(McuScheduleService);
    mcuResultService = app.get(McuResultService);
    mcuReminderScanService = app.get(McuReminderScanService);
    fitToWorkAssessmentService = app.get(FitToWorkAssessmentService);
    restrictedDutyAssignmentService = app.get(RestrictedDutyAssignmentService);
    reassessmentScanService = app.get(OccupationalHealthReassessmentScanService);
    pakCaseService = app.get(OccupationalDiseaseCaseService);
    clinicVisitLogService = app.get(ClinicVisitLogService);
    surveillanceProgramService = app.get(HealthSurveillanceProgramService);
    authorizedUserService = app.get(OccupationalHealthAuthorizedUserService);
    subjectRequestService = app.get(HealthDataSubjectRequestService);
    capaRegisterService = app.get(CapaRegisterService);
    workflowEngineService = app.get(WorkflowEngineService);
    prisma = app.get(PrismaService);
    await seedOccupationalHealthNotificationTemplates(adminPrisma);
  });

  afterAll(async () => {
    await app.close();
    await adminPrisma.$disconnect();
  });

  async function setupTenant() {
    const fixture = await seedTenantFixture();
    const { companyId, siteId, departmentId } = await seedSite(fixture.tenantId, fixture.userId);

    const ohStaff = await seedUserInTenant(fixture.tenantId, "OH Staff", { siteId });
    await assignRole(fixture.tenantId, ohStaff.id, "OCCUPATIONAL_HEALTH_STAFF");
    await grantPhiAuthorization(fixture.tenantId, ohStaff.id, siteId, fixture.userId);

    const ohStaffUnauthorized = await seedUserInTenant(fixture.tenantId, "OH Staff Unauthorized", { siteId });
    await assignRole(fixture.tenantId, ohStaffUnauthorized.id, "OCCUPATIONAL_HEALTH_STAFF");
    // SENGAJA TIDAK di-whitelist — dipakai kasus BR-02 gagal.

    const hseManager = await seedUserInTenant(fixture.tenantId, "HSE Manager");
    await assignRole(fixture.tenantId, hseManager.id, "HSE_MANAGER");
    const companyAdmin = await seedUserInTenant(fixture.tenantId, "Company Admin");
    await assignRole(fixture.tenantId, companyAdmin.id, "COMPANY_ADMIN");
    const tenantAdmin = await seedUserInTenant(fixture.tenantId, "Tenant Admin");
    await assignRole(fixture.tenantId, tenantAdmin.id, "TENANT_ADMIN");
    const supervisor = await seedUserInTenant(fixture.tenantId, "Supervisor", { departmentId });
    await assignRole(fixture.tenantId, supervisor.id, "SUPERVISOR");
    const employee = await seedUserInTenant(fixture.tenantId, "Worker Employee", { siteId, departmentId });
    await assignRole(fixture.tenantId, employee.id, "WORKER_EMPLOYEE");

    return { fixture, companyId, siteId, departmentId, ohStaff, ohStaffUnauthorized, hseManager, companyAdmin, tenantAdmin, supervisor, employee };
  }

  // Bertindak sbg task.assignedTo YANG SEBENARNYA (bukan daftar approverIds
  // tebakan) — fixture tenant ini SENGAJA punya DUA user role
  // OCCUPATIONAL_HEALTH_STAFF (ohStaff + ohStaffUnauthorized, utk skenario
  // BR-02), jadi resolusi ROLE_IN_SCOPE stage 1 TIDAK bisa ditebak di muka.
  async function approveAllPendingStages(tenantId: string, workflowInstanceId: string): Promise<void> {
    for (;;) {
      const task = await adminPrisma.workflowTask.findFirst({ where: { instanceId: workflowInstanceId, status: "PENDING" } });
      if (!task) break;
      await tenantContextStorage.run({ tenantId, userId: task.assignedTo }, () =>
        workflowEngineService.actOnTask(task.id, "APPROVE", undefined, task.assignedTo),
      );
      await sleep(150);
    }
    await sleep(300);
  }

  describe("BR-02 dual-gate — medical_records", () => {
    it("OH Staff whitelisted: create+getById berhasil, data terdekripsi benar", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };

      const record = await tenantContextStorage.run(ctx, () =>
        medicalRecordService.create(
          { employeeUserId: t.employee.id, companyId: t.companyId, siteId: t.siteId, bloodType: "O+", knownAllergies: "Penisilin" },
          "ROUTINE_CONSULTATION",
        ),
      );
      expect(record.bloodType).toBe("O+");
      expect(record.knownAllergies).toBe("Penisilin");

      const fetched = await tenantContextStorage.run(ctx, () => medicalRecordService.getById(record.id, "ROUTINE_CONSULTATION"));
      expect(fetched.bloodType).toBe("O+");
    });

    it("OH Staff TIDAK whitelisted: create ditolak ForbiddenException (BR-02)", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaffUnauthorized.id };

      await expect(
        tenantContextStorage.run(ctx, () =>
          medicalRecordService.create({ employeeUserId: t.employee.id, companyId: t.companyId, siteId: t.siteId, bloodType: "A+" }, "ROUTINE_CONSULTATION"),
        ),
      ).rejects.toThrow(/BR-02/);
    });

    it("whitelist EXPIRED: akses ditolak", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaffUnauthorized.id };
      await adminPrisma.occupationalHealthAuthorizedUser.create({
        data: {
          tenantId: t.fixture.tenantId,
          userId: t.ohStaffUnauthorized.id,
          authorizedScopeType: "SITE",
          authorizedScopeId: t.siteId,
          authorizationReason: "Fixture expired",
          authorizedBy: t.fixture.userId,
          authorizedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
          expiryDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
          status: "ACTIVE",
          createdBy: t.fixture.userId,
          updatedBy: t.fixture.userId,
        },
      });

      await expect(
        tenantContextStorage.run(ctx, () =>
          medicalRecordService.create({ employeeUserId: t.employee.id, companyId: t.companyId, siteId: t.siteId }, "ROUTINE_CONSULTATION"),
        ),
      ).rejects.toThrow(/BR-02/);
    });

    it("whitelist REVOKED: akses ditolak", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };
      const authCtx = { tenantId: t.fixture.tenantId, userId: t.tenantAdmin.id };

      const grants = await tenantContextStorage.run(authCtx, () => authorizedUserService.listByUser(t.ohStaff.id));
      await tenantContextStorage.run(authCtx, () => authorizedUserService.revoke(grants[0].id, "Kontrak berakhir"));

      await expect(
        tenantContextStorage.run(ctx, () =>
          medicalRecordService.create({ employeeUserId: t.employee.id, companyId: t.companyId, siteId: t.siteId }, "ROUTINE_CONSULTATION"),
        ),
      ).rejects.toThrow(/BR-02/);
    });

    it("percobaan ditolak -> alert keamanan ke Tenant Admin (PRD §8 baris 7)", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaffUnauthorized.id };

      await expect(
        tenantContextStorage.run(ctx, () =>
          medicalRecordService.create({ employeeUserId: t.employee.id, companyId: t.companyId, siteId: t.siteId }, "ROUTINE_CONSULTATION"),
        ),
      ).rejects.toThrow();

      const alert = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_PHI_ACCESS_DENIED", recipientUserId: t.tenantAdmin.id },
      });
      expect(alert).not.toBeNull();
    });
  });

  describe("BR-01 fail-closed access log + immutability", () => {
    it("getById() mencatat medical_record_access_logs (accessType=VIEW)", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };

      const record = await tenantContextStorage.run(ctx, () =>
        medicalRecordService.create({ employeeUserId: t.employee.id, companyId: t.companyId, siteId: t.siteId, bloodType: "B+" }, "ROUTINE_CONSULTATION"),
      );
      await tenantContextStorage.run(ctx, () => medicalRecordService.getById(record.id, "MCU_REVIEW", "Cek riwayat sebelum MCU"));

      const log = await adminPrisma.medicalRecordAccessLog.findFirst({
        where: { tenantId: t.fixture.tenantId, accessedEntityId: record.id, accessType: "VIEW", accessedByUserId: t.ohStaff.id },
      });
      expect(log).not.toBeNull();
      expect(log!.reasonForAccess).toBe("MCU_REVIEW");
    });

    it("append-only: UPDATE/DELETE via role qhse_app ditolak DB (REVOKE, bukan trigger)", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };
      const record = await tenantContextStorage.run(ctx, () =>
        medicalRecordService.create({ employeeUserId: t.employee.id, companyId: t.companyId, siteId: t.siteId }, "ROUTINE_CONSULTATION"),
      );
      await tenantContextStorage.run(ctx, () => medicalRecordService.getById(record.id, "ROUTINE_CONSULTATION"));
      const log = await adminPrisma.medicalRecordAccessLog.findFirstOrThrow({ where: { tenantId: t.fixture.tenantId, accessedEntityId: record.id } });

      await expect(
        tenantContextStorage.run(ctx, () =>
          prisma.withRls((tx) => tx.$executeRawUnsafe(`UPDATE medical_record_access_logs SET reason_notes = 'tampered' WHERE access_log_id = '${log.id}'`)),
        ),
      ).rejects.toThrow();

      await expect(
        tenantContextStorage.run(ctx, () => prisma.withRls((tx) => tx.$executeRawUnsafe(`DELETE FROM medical_record_access_logs WHERE access_log_id = '${log.id}'`))),
      ).rejects.toThrow();
    });
  });

  describe("BR-05 enkripsi field-level", () => {
    it("kolom *_encrypted mentah di DB BUKAN plaintext, decrypt via service benar", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };

      const record = await tenantContextStorage.run(ctx, () =>
        medicalRecordService.create({ employeeUserId: t.employee.id, companyId: t.companyId, siteId: t.siteId, chronicConditions: "Hipertensi ringan" }, "ROUTINE_CONSULTATION"),
      );

      const raw = await adminPrisma.medicalRecord.findUniqueOrThrow({ where: { id: record.id } });
      expect(raw.chronicConditionsEncrypted).not.toBeNull();
      expect(raw.chronicConditionsEncrypted).not.toContain("Hipertensi");
      expect(raw.chronicConditionsEncrypted!.split(":").length).toBe(3); // iv:authTag:ciphertext

      const fetched = await tenantContextStorage.run(ctx, () => medicalRecordService.getById(record.id, "ROUTINE_CONSULTATION"));
      expect(fetched.chronicConditions).toBe("Hipertensi ringan");
    });
  });

  describe("MCU siklus + BR-07 pre-employment clearance", () => {
    it("PRE_EMPLOYMENT: schedule->COMPLETED, result NORMAL, fit_to_work FIT -> clearance lengkap", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };

      const schedule = await tenantContextStorage.run(ctx, () =>
        mcuScheduleService.create({ siteId: t.siteId, employeeUserId: t.employee.id, mcuType: "PRE_EMPLOYMENT", scheduledDate: new Date() }),
      );
      await tenantContextStorage.run(ctx, () => mcuScheduleService.transitionStatus(schedule.id, "COMPLETED"));

      const result = await tenantContextStorage.run(ctx, () =>
        mcuResultService.create(
          {
            mcuScheduleId: schedule.id,
            employeeUserId: t.employee.id,
            siteIdForScope: t.siteId,
            examinationDate: new Date(),
            examiningPhysicianName: "dr. Fixture",
            overallMcuResult: "NORMAL",
          },
          "MCU_REVIEW",
        ),
      );
      expect(result.overallMcuResult).toBe("NORMAL");

      const fitToWork = await tenantContextStorage.run(ctx, () =>
        fitToWorkAssessmentService.create(
          {
            siteId: t.siteId,
            employeeUserId: t.employee.id,
            assessmentDate: new Date(),
            assessmentTrigger: "POST_MCU",
            relatedMcuResultId: result.id,
            fitStatus: "FIT",
          },
          "MCU_REVIEW",
        ),
      );
      expect(fitToWork.fitStatus).toBe("FIT");

      // BR-07 — assembling dari record nyata, pola sama pure-fn unit test.
      const { isPreEmploymentClearanceComplete } = await import("../../src/modules/domains/occupational-health/mcu-lifecycle");
      expect(
        isPreEmploymentClearanceComplete({ mcuScheduleStatus: "COMPLETED", hasMcuResult: true, fitStatus: fitToWork.fitStatus }),
      ).toBe(true);
    });

    it("MAJOR_FINDING/REQUIRES_FOLLOW_UP -> notifikasi ke OH Staff (bukan HSE Manager)", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };
      const schedule = await tenantContextStorage.run(ctx, () =>
        mcuScheduleService.create({ siteId: t.siteId, employeeUserId: t.employee.id, mcuType: "PERIODIC", scheduledDate: new Date() }),
      );
      await tenantContextStorage.run(ctx, () =>
        mcuResultService.create(
          { mcuScheduleId: schedule.id, employeeUserId: t.employee.id, siteIdForScope: t.siteId, examinationDate: new Date(), examiningPhysicianName: "dr. Fixture", overallMcuResult: "REQUIRES_FOLLOW_UP" },
          "MCU_REVIEW",
        ),
      );

      const notifOhStaff = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_MCU_REQUIRES_FOLLOW_UP", recipientUserId: t.ohStaff.id },
      });
      expect(notifOhStaff).not.toBeNull();
      const notifHseManager = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_MCU_REQUIRES_FOLLOW_UP", recipientUserId: t.hseManager.id },
      });
      expect(notifHseManager).toBeNull();
    });
  });

  describe("BR-04 boundary field — restricted duty & supervisor summary", () => {
    it("FIT_WITH_RESTRICTION -> requiresRestrictedDuty true, getSummaryForSupervisor TIDAK bawa restrictionDetails", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };

      const assessment = await tenantContextStorage.run(ctx, () =>
        fitToWorkAssessmentService.create(
          {
            siteId: t.siteId,
            departmentId: t.departmentId,
            employeeUserId: t.employee.id,
            assessmentDate: new Date(),
            assessmentTrigger: "ROUTINE",
            fitStatus: "FIT_WITH_RESTRICTION",
            restrictionDetails: "Diagnosis rinci rahasia — hernia diskus L4-L5",
            restrictionSummaryForSupervisor: "Pembatasan kerja ketinggian s.d. 20-08-2026",
          },
          "ROUTINE_CONSULTATION",
        ),
      );
      expect(fitToWorkAssessmentService.requiresRestrictedDuty(assessment.fitStatus)).toBe(true);

      const restrictedDuty = await tenantContextStorage.run({ tenantId: t.fixture.tenantId, userId: t.supervisor.id }, () =>
        restrictedDutyAssignmentService.create({
          siteId: t.siteId,
          departmentId: t.departmentId,
          employeeUserId: t.employee.id,
          fitToWorkAssessmentId: assessment.id,
          restrictionType: "NO_HEIGHT_WORK",
          alternativeTaskDescription: "Ditugaskan ke area gudang lantai dasar",
          startDate: new Date(),
        }),
      );
      expect(restrictedDuty.restrictionType).toBe("NO_HEIGHT_WORK");

      const summary = await tenantContextStorage.run({ tenantId: t.fixture.tenantId, userId: t.supervisor.id }, () =>
        fitToWorkAssessmentService.getSummaryForSupervisor(assessment.id),
      );
      expect(summary.restrictionSummaryForSupervisor).toBe("Pembatasan kerja ketinggian s.d. 20-08-2026");
      expect(Object.keys(summary)).not.toContain("restrictionDetails");
      expect(Object.keys(summary)).not.toContain("restrictionDetailsEncrypted");

      const notifSupervisor = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_FIT_TO_WORK_UPDATED", recipientUserId: t.supervisor.id },
      });
      expect(notifSupervisor).not.toBeNull();
      // Notification HANYA menyimpan title/body ter-render (BUKAN raw
      // variables dict, lihat schema Notification) — bukti BR-04 structural
      // adalah body BERISI boundary field TAPI TIDAK PERNAH berisi
      // diagnosis/restrictionDetails mentah (template TIDAK mereferensikan
      // variabel itu sama sekali, lihat seed-occupational-health-notification-templates.ts).
      expect(notifSupervisor!.body).toContain("Pembatasan kerja ketinggian");
      expect(notifSupervisor!.body).not.toContain("hernia");
      expect(notifSupervisor!.body).not.toContain("rahasia");
    });
  });

  describe("PAK Case — OH_PAK_CASE workflow 2-stage, BR-08 dual-notifikasi, BR-10 CAPA manual", () => {
    it("SEVERE: notifikasi agregat (Top Mgmt, tanpa caseNumber) + detail (OH Staff, dengan caseNumber)", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };

      const pakCase = await tenantContextStorage.run(ctx, () =>
        pakCaseService.create(
          {
            siteId: t.siteId,
            departmentId: t.departmentId,
            employeeUserId: t.employee.id,
            diagnosisDate: new Date(),
            diagnosedBy: "dr. Fixture, Sp.OK",
            diseaseCategory: "HEARING_LOSS_NIHL",
            diagnosisDetail: "NIHL bilateral derajat sedang",
            severityClassification: "SEVERE",
          },
          "PAK_INVESTIGATION",
        ),
      );
      expect(pakCase.caseNumber).toContain("PAK");

      const aggregateNotif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_PAK_CASE_SEVERE_AGGREGATE", recipientUserId: t.companyAdmin.id },
      });
      expect(aggregateNotif).not.toBeNull();
      // BR-08 — template AGGREGATE TIDAK mereferensikan {{caseNumber}} sama
      // sekali (lihat seed template), jadi body TIDAK PERNAH memuatnya.
      expect(aggregateNotif!.body).not.toContain(pakCase.caseNumber);

      const detailNotif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_PAK_CASE_SEVERE_DETAIL", recipientUserId: t.ohStaff.id },
      });
      expect(detailNotif).not.toBeNull();
      expect(detailNotif!.body).toContain(pakCase.caseNumber);

      // OH_PAK_CASE workflow — Physician confirm -> HSE Manager review -> APPROVED.
      await tenantContextStorage.run(ctx, () => pakCaseService.submitForReview(pakCase.id));
      const withWorkflow = await adminPrisma.occupationalDiseaseCase.findUniqueOrThrow({ where: { id: pakCase.id } });
      expect(withWorkflow.workflowInstanceId).not.toBeNull();

      await approveAllPendingStages(t.fixture.tenantId, withWorkflow.workflowInstanceId!);

      const afterWorkflow = await adminPrisma.occupationalDiseaseCase.findUniqueOrThrow({ where: { id: pakCase.id } });
      expect(afterWorkflow.workflowInstanceId).toBeNull();
      expect(afterWorkflow.caseStatus).toBe("OPEN"); // TIDAK berubah oleh workflow completion, lihat banner comment markReviewCompleted().

      // BR-10 — link CAPA manual (caller create CapaRegister dulu, source_type=OCCUPATIONAL_DISEASE_CASE).
      const capa = await tenantContextStorage.run(ctx, () =>
        capaRegisterService.create({
          sourceType: "OCCUPATIONAL_DISEASE_CASE",
          sourceId: pakCase.id,
          category: "PREVENTIVE",
          priority: "HIGH",
          title: "Tingkatkan APD pendengaran Area Produksi",
          problemStatement: "Ditemukan pola paparan bising berulang — tindakan sistemik, BUKAN identitas individu.",
          siteId: t.siteId,
        }),
      );
      await tenantContextStorage.run(ctx, () => pakCaseService.linkCapaRegister(pakCase.id, capa.id));
      const linked = await adminPrisma.occupationalDiseaseCase.findUniqueOrThrow({ where: { id: pakCase.id } });
      expect(linked.capaRegisterId).toBe(capa.id);
    }, 30000);

    it("MILD: TIDAK memicu notifikasi eskalasi apa pun", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };
      const pakCase = await tenantContextStorage.run(ctx, () =>
        pakCaseService.create(
          { siteId: t.siteId, employeeUserId: t.employee.id, diagnosisDate: new Date(), diagnosedBy: "dr. Fixture", diseaseCategory: "SKIN_DERMATITIS", severityClassification: "MILD" },
          "PAK_INVESTIGATION",
        ),
      );
      const aggregateNotif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_PAK_CASE_SEVERE_AGGREGATE", entityId: pakCase.id },
      });
      expect(aggregateNotif).toBeNull();
    });
  });

  describe("Clinic Visit & Health Surveillance — CRUD dasar", () => {
    it("clinic_visit_logs employee: dual-gate + access-log berlaku", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };
      const visit = await tenantContextStorage.run(ctx, () =>
        clinicVisitLogService.create(
          { siteId: t.siteId, employeeUserId: t.employee.id, visitDatetime: new Date(), visitType: "ILLNESS", chiefComplaint: "Demam", workStatusAfterVisit: "RETURN_TO_WORK" },
          "ROUTINE_CONSULTATION",
        ),
      );
      expect(visit.chiefComplaint).toBe("Demam");

      const log = await adminPrisma.medicalRecordAccessLog.findFirst({
        where: { tenantId: t.fixture.tenantId, accessedEntityId: visit.id, accessedEntityType: "CLINIC_VISIT" },
      });
      expect(log).not.toBeNull();
    });

    it("clinic_visit_logs visitor (TANPA employeeUserId): TIDAK memerlukan reasonForAccess/dual-gate", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaffUnauthorized.id }; // sengaja pakai staf TIDAK whitelisted
      const visit = await tenantContextStorage.run(ctx, () =>
        clinicVisitLogService.create({
          siteId: t.siteId,
          visitorName: "Tamu Vendor",
          visitorType: "VISITOR",
          visitDatetime: new Date(),
          visitType: "CONSULTATION",
          workStatusAfterVisit: "RETURN_TO_WORK",
        }),
      );
      expect(visit.visitorName).toBe("Tamu Vendor");
    });

    it("health_surveillance_programs + enrollment CRUD dasar", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };
      const program = await tenantContextStorage.run(ctx, () =>
        surveillanceProgramService.create({
          siteId: t.siteId,
          programName: "Surveilans Kebisingan Area Produksi",
          exposureType: "NOISE",
          targetPopulationCriteria: "Operator mesin produksi area cutting",
          monitoringFrequency: "ANNUAL",
          startDate: new Date(),
        }),
      );
      const enrollment = await tenantContextStorage.run(ctx, () => surveillanceProgramService.enroll(program.id, t.employee.id, new Date()));
      expect(enrollment.employeeUserId).toBe(t.employee.id);

      const active = await tenantContextStorage.run(ctx, () => surveillanceProgramService.listActiveEnrollmentsByEmployee(t.employee.id));
      expect(active.length).toBe(1);
    });
  });

  describe("BR-06 anonymization — health_data_subject_requests", () => {
    it("retensi minimum BELUM terlampaui -> REJECTED dgn rejectionReason", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };
      await tenantContextStorage.run(ctx, () =>
        medicalRecordService.create({ employeeUserId: t.employee.id, companyId: t.companyId, siteId: t.siteId, bloodType: "AB+" }, "ROUTINE_CONSULTATION"),
      );

      const request = await tenantContextStorage.run({ tenantId: t.fixture.tenantId, userId: t.employee.id }, () =>
        subjectRequestService.submit({ employeeUserId: t.employee.id, requestType: "ERASURE_ANONYMIZATION", requestDetail: "Minta data dihapus" }),
      );
      const processed = await tenantContextStorage.run(ctx, () => subjectRequestService.processErasure(request.id));
      expect(processed.status).toBe("REJECTED");
      expect(processed.rejectionReason).toMatch(/Retensi hukum minimum/);

      const stillHasData = await adminPrisma.medicalRecord.findUniqueOrThrow({ where: { employeeUserId: t.employee.id } });
      expect(stillHasData.bloodTypeEncrypted).not.toBeNull();
      expect(stillHasData.recordStatus).toBe("ACTIVE");
    });

    it("retensi minimum SUDAH terlampaui (override) -> COMPLETED, medical_records dianonimkan (bukan hard-delete)", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };
      const record = await tenantContextStorage.run(ctx, () =>
        medicalRecordService.create({ employeeUserId: t.employee.id, companyId: t.companyId, siteId: t.siteId, bloodType: "O-", knownAllergies: "Sulfa" }, "ROUTINE_CONSULTATION"),
      );
      // Mundurkan updatedAt langsung via admin (bypass service) supaya lastRecordActivityDate "tua".
      await adminPrisma.medicalRecord.update({ where: { id: record.id }, data: { updatedAt: new Date("2015-01-01") } });

      const request = await tenantContextStorage.run({ tenantId: t.fixture.tenantId, userId: t.employee.id }, () =>
        subjectRequestService.submit({ employeeUserId: t.employee.id, requestType: "ERASURE_ANONYMIZATION", requestDetail: "Minta data dihapus" }),
      );
      const processed = await tenantContextStorage.run(ctx, () => subjectRequestService.processErasure(request.id));
      expect(processed.status).toBe("COMPLETED");

      const anonymized = await adminPrisma.medicalRecord.findUniqueOrThrow({ where: { id: record.id } });
      expect(anonymized.recordStatus).toBe("ANONYMIZED");
      expect(anonymized.bloodTypeEncrypted).toBeNull();
      expect(anonymized.knownAllergiesEncrypted).toBeNull();
      // BUKAN hard-delete — baris TETAP ADA, employeeUserId TETAP tertaut (audit trail).
      expect(anonymized.employeeUserId).toBe(t.employee.id);

      const notif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_SUBJECT_REQUEST_SUBMITTED", recipientUserId: t.ohStaff.id },
      });
      expect(notif).not.toBeNull();
    });
  });

  describe("Scan jobs — mcu-reminder-scan + occupational-health-reassessment-scan", () => {
    it("mcu-reminder-scan: MCU dalam window 14 hari -> notifikasi employee+OH Staff, idempoten", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 10);

      const schedule = await tenantContextStorage.run(ctx, () =>
        mcuScheduleService.create({ siteId: t.siteId, employeeUserId: t.employee.id, mcuType: "PERIODIC", scheduledDate }),
      );

      await mcuReminderScanService.scan();

      const afterScan = await adminPrisma.mcuSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
      expect(afterScan.reminderSentAt).not.toBeNull();

      const notifEmployee = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_MCU_DUE", recipientUserId: t.employee.id },
      });
      expect(notifEmployee).not.toBeNull();
      const notifOhStaff = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_MCU_DUE", recipientUserId: t.ohStaff.id },
      });
      expect(notifOhStaff).not.toBeNull();

      const countBefore = await adminPrisma.notification.count({ where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_MCU_DUE" } });
      await mcuReminderScanService.scan();
      const countAfter = await adminPrisma.notification.count({ where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_MCU_DUE" } });
      expect(countAfter).toBe(countBefore);
    }, 30000);

    it("occupational-health-reassessment-scan: next_reassessment_date lewat -> notifikasi OH Staff, idempoten", async () => {
      const t = await setupTenant();
      const ctx = { tenantId: t.fixture.tenantId, userId: t.ohStaff.id };
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const assessment = await tenantContextStorage.run(ctx, () =>
        fitToWorkAssessmentService.create(
          { siteId: t.siteId, employeeUserId: t.employee.id, assessmentDate: new Date(), assessmentTrigger: "ROUTINE", fitStatus: "FIT", nextReassessmentDate: pastDate },
          "ROUTINE_CONSULTATION",
        ),
      );

      await reassessmentScanService.scan();

      const afterScan = await adminPrisma.fitToWorkAssessment.findUniqueOrThrow({ where: { id: assessment.id } });
      expect(afterScan.reassessmentReminderSentAt).not.toBeNull();

      const notif = await adminPrisma.notification.findFirst({
        where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_REASSESSMENT_DUE", recipientUserId: t.ohStaff.id },
      });
      expect(notif).not.toBeNull();

      const countBefore = await adminPrisma.notification.count({ where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_REASSESSMENT_DUE" } });
      await reassessmentScanService.scan();
      const countAfter = await adminPrisma.notification.count({ where: { tenantId: t.fixture.tenantId, eventType: "OCCUPATIONAL_HEALTH_REASSESSMENT_DUE" } });
      expect(countAfter).toBe(countBefore);
    }, 30000);
  });

  describe("Isolasi tenant (RLS)", () => {
    it("medicalRecordService.getById() tenant lain -> not found", async () => {
      const tenantA = await setupTenant();
      const tenantB = await setupTenant();
      const actorA = { tenantId: tenantA.fixture.tenantId, userId: tenantA.ohStaff.id };
      const actorB = { tenantId: tenantB.fixture.tenantId, userId: tenantB.ohStaff.id };

      const record = await tenantContextStorage.run(actorA, () =>
        medicalRecordService.create({ employeeUserId: tenantA.employee.id, companyId: tenantA.companyId, siteId: tenantA.siteId }, "ROUTINE_CONSULTATION"),
      );

      await expect(tenantContextStorage.run(actorB, () => medicalRecordService.getById(record.id, "ROUTINE_CONSULTATION"))).rejects.toThrow();
    }, 60000);

    it("occupationalHealthAuthorizedUser scope SITE tenant A TIDAK mencakup site tenant B", async () => {
      const tenantA = await setupTenant();
      const tenantB = await setupTenant();
      // ohStaff tenant A TIDAK PERNAH di-whitelist utk site tenant B — pastikan create() memakai context tenant B ditolak walau (secara keliru) dipanggil dgn userId ohStaff tenant A.
      await expect(
        tenantContextStorage.run({ tenantId: tenantB.fixture.tenantId, userId: tenantA.ohStaff.id }, () =>
          medicalRecordService.create({ employeeUserId: tenantB.employee.id, companyId: tenantB.companyId, siteId: tenantB.siteId }, "ROUTINE_CONSULTATION"),
        ),
      ).rejects.toThrow(/BR-02/);
    }, 60000);
  });
});
