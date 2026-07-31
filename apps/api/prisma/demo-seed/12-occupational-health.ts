// Data demo Occupational Health (Modul 13, task 5.3) — modul PALING ketat
// aksesnya di seluruh sistem: SEMUA panggilan PHI-gated (medical_records/
// mcu_results/fit_to_work_assessments/pak_case/clinic_visit employee) WAJIB
// aktor terdaftar AKTIF di occupational_health_authorized_users (BR-02
// dual-gate) — LANGKAH PERTAMA file ini WAJIB grant() utk Ratna Sari
// (OCCUPATIONAL_HEALTH_STAFF satu-satunya di tenant demo), scope TENANT
// (bukan per-SITE) spy mencakup ketiga site sekaligus, SEBELUM panggilan
// PHI apa pun — tanpa ini seluruh sisa file akan ForbiddenException (BR-02).
// 3 medical record, 3 jadwal MCU + 2 hasil, 3 fit-to-work (bersih/
// restricted-duty BR-04/reassessment due), 2 PAK case (SEVERE siklus penuh
// +CAPA BR-10, MILD tanpa eskalasi), 2 kunjungan klinik (employee/visitor),
// 1 program surveilans+2 enrollment, 2 permintaan subjek data (REJECTED
// retensi belum cukup, COMPLETED dianonimkan BR-06), 2 scan job.
import { INestApplicationContext } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
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
import { tenantContextStorage } from "../../src/platform/tenancy/tenant-context";
import { actor, actors, daysAgo, daysFromNow, DemoContext } from "./context";
import { approveAllPendingStages } from "./shared";

export async function seedOccupationalHealth(app: INestApplicationContext, adminPrisma: PrismaClient, ctx: DemoContext): Promise<void> {
  const authorizedUserService = app.get(OccupationalHealthAuthorizedUserService);
  const medicalRecordService = app.get(MedicalRecordService);
  const mcuScheduleService = app.get(McuScheduleService);
  const mcuResultService = app.get(McuResultService);
  const mcuReminderScanService = app.get(McuReminderScanService);
  const fitToWorkAssessmentService = app.get(FitToWorkAssessmentService);
  const restrictedDutyAssignmentService = app.get(RestrictedDutyAssignmentService);
  const reassessmentScanService = app.get(OccupationalHealthReassessmentScanService);
  const pakCaseService = app.get(OccupationalDiseaseCaseService);
  const clinicVisitLogService = app.get(ClinicVisitLogService);
  const surveillanceProgramService = app.get(HealthSurveillanceProgramService);
  const subjectRequestService = app.get(HealthDataSubjectRequestService);
  const capaRegisterService = app.get(CapaRegisterService);

  const tenantAdmin = actor(ctx, "TENANT_ADMIN");
  const ohStaff = actor(ctx, "OCCUPATIONAL_HEALTH_STAFF");
  const supervisor = actor(ctx, "SUPERVISOR");
  const [worker1, worker2, worker3, worker4] = actors(ctx, "WORKER_EMPLOYEE");
  const run = <T>(userId: string, fn: () => Promise<T>) => tenantContextStorage.run({ tenantId: ctx.tenantId, userId }, fn);

  // 0. BR-02 dual-gate prasyarat — grant PHI TENANT-wide utk Ratna Sari
  // SEBELUM panggilan PHI apa pun di bawah (tanpa ini SEMUA akan ForbiddenException).
  await run(tenantAdmin.id, () =>
    authorizedUserService.grant({
      userId: ohStaff.id,
      authorizedScopeType: "TENANT",
      authorizedScopeId: ctx.tenantId,
      medicalPractitionerLicenseNo: "STR-OH-2026-00123",
      authorizationReason: "Petugas Occupational Health resmi ditunjuk Tenant Admin",
    }),
  );

  // 1. Medical Record — profil lengkap Joko.
  await run(ohStaff.id, () =>
    medicalRecordService.create(
      {
        employeeUserId: worker1.id,
        companyId: ctx.companyId,
        siteId: ctx.siteIdCepu,
        bloodType: "O+",
        knownAllergies: "Penisilin",
        chronicConditions: "Hipertensi ringan terkontrol",
        emergencyMedicalContactName: "Siti Aminah",
        emergencyMedicalContactPhone: "081234567890",
        emergencyMedicalContactRelationship: "Istri",
      },
      "ROUTINE_CONSULTATION",
    ),
  );

  // 2. MCU PRE_EMPLOYMENT Bambang — clearance lengkap (BR-07).
  const schedule1 = await run(ohStaff.id, () =>
    mcuScheduleService.create({ siteId: ctx.siteIdCepu, employeeUserId: worker2.id, mcuType: "PRE_EMPLOYMENT", scheduledDate: daysAgo(30) }),
  );
  await run(ohStaff.id, () => mcuScheduleService.transitionStatus(schedule1.id, "COMPLETED"));
  const result1 = await run(ohStaff.id, () =>
    mcuResultService.create(
      {
        mcuScheduleId: schedule1.id,
        employeeUserId: worker2.id,
        siteIdForScope: ctx.siteIdCepu,
        examinationDate: daysAgo(30),
        examiningPhysicianName: "dr. Andini Pratiwi, Sp.OK",
        overallMcuResult: "NORMAL",
      },
      "MCU_REVIEW",
    ),
  );
  const fitToWork1 = await run(ohStaff.id, () =>
    fitToWorkAssessmentService.create(
      { siteId: ctx.siteIdCepu, employeeUserId: worker2.id, assessmentDate: daysAgo(29), assessmentTrigger: "POST_MCU", relatedMcuResultId: result1.id, fitStatus: "FIT" },
      "MCU_REVIEW",
    ),
  );
  await run(ohStaff.id, () => mcuResultService.linkFitToWorkAssessment(result1.id, fitToWork1.id));

  // 3. MCU PERIODIC Joko — REQUIRES_FOLLOW_UP (notifikasi ke OH Staff, BUKAN
  // HSE Manager) -> Fit to Work FIT_WITH_RESTRICTION -> Restricted Duty (BR-04).
  const schedule2 = await run(ohStaff.id, () =>
    mcuScheduleService.create({ siteId: ctx.siteIdCepu, employeeUserId: worker1.id, mcuType: "PERIODIC", scheduledDate: daysAgo(10) }),
  );
  await run(ohStaff.id, () => mcuScheduleService.transitionStatus(schedule2.id, "COMPLETED"));
  const result2 = await run(ohStaff.id, () =>
    mcuResultService.create(
      {
        mcuScheduleId: schedule2.id,
        employeeUserId: worker1.id,
        siteIdForScope: ctx.siteIdCepu,
        examinationDate: daysAgo(10),
        examiningPhysicianName: "dr. Andini Pratiwi, Sp.OK",
        overallMcuResult: "REQUIRES_FOLLOW_UP",
        physicianConclusion: "Tekanan darah tinggi, perlu kontrol rutin dan evaluasi ulang 3 bulan",
      },
      "MCU_REVIEW",
    ),
  );
  const fitToWork2 = await run(ohStaff.id, () =>
    fitToWorkAssessmentService.create(
      {
        siteId: ctx.siteIdCepu,
        departmentId: ctx.departmentIdOps,
        employeeUserId: worker1.id,
        assessmentDate: daysAgo(9),
        assessmentTrigger: "POST_MCU",
        relatedMcuResultId: result2.id,
        fitStatus: "FIT_WITH_RESTRICTION",
        restrictionDetails: "Hipertensi tidak terkontrol, tekanan darah 160/100, berisiko pusing mendadak di ketinggian",
        restrictionSummaryForSupervisor: "Pembatasan kerja ketinggian s.d. evaluasi ulang",
        restrictionValidFrom: daysAgo(9),
        restrictionValidUntil: daysFromNow(80),
        nextReassessmentDate: daysFromNow(80),
      },
      "MCU_REVIEW",
    ),
  );
  await run(ohStaff.id, () => mcuResultService.linkFitToWorkAssessment(result2.id, fitToWork2.id));
  const restrictedDuty1 = await run(supervisor.id, () =>
    restrictedDutyAssignmentService.create({
      siteId: ctx.siteIdCepu,
      departmentId: ctx.departmentIdOps,
      employeeUserId: worker1.id,
      fitToWorkAssessmentId: fitToWork2.id,
      restrictionType: "NO_HEIGHT_WORK",
      alternativeTaskDescription: "Ditugaskan ke area gudang lantai dasar sementara",
      startDate: daysAgo(9),
    }),
  );
  await run(ohStaff.id, () => fitToWorkAssessmentService.linkRestrictedDutyAssignment(fitToWork2.id, restrictedDuty1.id));
  await run(supervisor.id, () => restrictedDutyAssignmentService.confirmCompliance(restrictedDuty1.id));

  // 4. Fit to Work Fitri — reassessment SUDAH lewat (dipanggil scan di akhir).
  await run(ohStaff.id, () =>
    fitToWorkAssessmentService.create(
      { siteId: ctx.siteIdBalikpapan, employeeUserId: worker3.id, assessmentDate: daysAgo(95), assessmentTrigger: "ROUTINE", fitStatus: "FIT", nextReassessmentDate: daysAgo(1) },
      "ROUTINE_CONSULTATION",
    ),
  );

  // 5. Jadwal MCU Fitri — dalam window 14 hari, dibiarkan SCHEDULED (mcu-reminder-scan di akhir).
  await run(ohStaff.id, () =>
    mcuScheduleService.create({ siteId: ctx.siteIdBalikpapan, employeeUserId: worker3.id, mcuType: "PERIODIC", scheduledDate: daysFromNow(10) }),
  );

  // 6. PAK Case SEVERE (Bambang) — dual-notifikasi (BR-08) + workflow 2-stage
  // + link CAPA manual (BR-10) + penentuan keterkaitan kerja + UNDER_TREATMENT.
  const pakCase1 = await run(ohStaff.id, () =>
    pakCaseService.create(
      {
        siteId: ctx.siteIdCepu,
        departmentId: ctx.departmentIdOps,
        employeeUserId: worker2.id,
        diagnosisDate: daysAgo(15),
        diagnosedBy: "dr. Andini Pratiwi, Sp.OK",
        diseaseCategory: "HEARING_LOSS_NIHL",
        diagnosisDetail: "NIHL bilateral derajat sedang, ambang dengar turun 35dB",
        severityClassification: "SEVERE",
      },
      "PAK_INVESTIGATION",
    ),
  );
  await run(ohStaff.id, () => pakCaseService.submitForReview(pakCase1.id));
  const pakCase1WithWorkflow = await adminPrisma.occupationalDiseaseCase.findUniqueOrThrow({ where: { id: pakCase1.id } });
  await approveAllPendingStages(app, adminPrisma, ctx.tenantId, pakCase1WithWorkflow.workflowInstanceId!);
  const capaPak1 = await run(ohStaff.id, () =>
    capaRegisterService.create({
      sourceType: "OCCUPATIONAL_DISEASE_CASE",
      sourceId: pakCase1.id,
      category: "PREVENTIVE",
      priority: "HIGH",
      title: "Tingkatkan APD pendengaran Area Produksi",
      problemStatement: "Ditemukan pola paparan bising berulang — tindakan sistemik, bukan identitas individu",
      siteId: ctx.siteIdCepu,
    }),
  );
  await run(ohStaff.id, () => pakCaseService.linkCapaRegister(pakCase1.id, capaPak1.id));
  await run(ohStaff.id, () => pakCaseService.recordWorkRelatednessDetermination(pakCase1.id, "CONFIRMED_WORK_RELATED"));
  await run(ohStaff.id, () => pakCaseService.transitionStatus(pakCase1.id, "UNDER_TREATMENT"));

  // 7. PAK Case MILD (Eko) — TIDAK memicu eskalasi apa pun, dibiarkan OPEN.
  await run(ohStaff.id, () =>
    pakCaseService.create(
      {
        siteId: ctx.siteIdBalikpapan,
        employeeUserId: worker4.id,
        diagnosisDate: daysAgo(5),
        diagnosedBy: "dr. Andini Pratiwi, Sp.OK",
        diseaseCategory: "SKIN_DERMATITIS",
        diagnosisDetail: "Dermatitis kontak ringan area tangan",
        severityClassification: "MILD",
      },
      "PAK_INVESTIGATION",
    ),
  );

  // 8. Kunjungan klinik — employee (dual-gate+access-log berlaku).
  await run(ohStaff.id, () =>
    clinicVisitLogService.create(
      {
        siteId: ctx.siteIdCepu,
        employeeUserId: worker1.id,
        visitDatetime: daysAgo(2),
        visitType: "ILLNESS",
        chiefComplaint: "Demam dan batuk",
        treatmentGiven: "Paracetamol, istirahat 1 hari",
        workStatusAfterVisit: "RETURN_TO_WORK",
      },
      "ROUTINE_CONSULTATION",
    ),
  );

  // 9. Kunjungan klinik — visitor (TANPA employeeUserId, tanpa dual-gate/reasonForAccess).
  await run(ohStaff.id, () =>
    clinicVisitLogService.create({
      siteId: ctx.siteIdHq,
      visitorName: "Tamu Vendor — PT Suplai Alat",
      visitorType: "VISITOR",
      visitDatetime: daysAgo(1),
      visitType: "CONSULTATION",
      workStatusAfterVisit: "RETURN_TO_WORK",
    }),
  );

  // 10. Program surveilans kebisingan + 2 enrollment.
  const program1 = await run(ohStaff.id, () =>
    surveillanceProgramService.create({
      siteId: ctx.siteIdCepu,
      programName: "Surveilans Kebisingan Area Produksi",
      exposureType: "NOISE",
      targetPopulationCriteria: "Operator mesin produksi area cutting & genset",
      monitoringFrequency: "ANNUAL",
      startDate: daysAgo(180),
    }),
  );
  await run(ohStaff.id, () => surveillanceProgramService.enroll(program1.id, worker1.id, daysAgo(180)));
  await run(ohStaff.id, () => surveillanceProgramService.enroll(program1.id, worker2.id, daysAgo(180)));

  // 11. Health Data Subject Request — retensi BELUM cukup -> REJECTED.
  await run(ohStaff.id, () =>
    medicalRecordService.create({ employeeUserId: worker3.id, companyId: ctx.companyId, siteId: ctx.siteIdBalikpapan, bloodType: "A+" }, "ROUTINE_CONSULTATION"),
  );
  const request1 = await run(worker3.id, () =>
    subjectRequestService.submit({ employeeUserId: worker3.id, requestType: "ERASURE_ANONYMIZATION", requestDetail: "Karyawan resign, minta data dihapus" }),
  );
  await run(ohStaff.id, () => subjectRequestService.processErasure(request1.id));

  // 12. Health Data Subject Request — retensi SUDAH lewat (updatedAt dibackdate
  // admin, pola sama integration-spec.ts) -> COMPLETED, medical_records dianonimkan (BR-06).
  const medicalRecordEko = await run(ohStaff.id, () =>
    medicalRecordService.create(
      { employeeUserId: worker4.id, companyId: ctx.companyId, siteId: ctx.siteIdBalikpapan, bloodType: "B+", knownAllergies: "Tidak ada" },
      "ROUTINE_CONSULTATION",
    ),
  );
  await adminPrisma.medicalRecord.update({ where: { id: medicalRecordEko.id }, data: { updatedAt: new Date("2015-01-01") } });
  const request2 = await run(worker4.id, () =>
    subjectRequestService.submit({ employeeUserId: worker4.id, requestType: "ERASURE_ANONYMIZATION", requestDetail: "Karyawan resign lama, minta data dihapus sesuai hak subjek data" }),
  );
  await run(ohStaff.id, () => subjectRequestService.processErasure(request2.id));

  await mcuReminderScanService.scan();
  await reassessmentScanService.scan();

  // eslint-disable-next-line no-console
  console.log(
    "  Occupational Health: PHI grant TENANT-wide, 3 medical record, MCU pre-employment+periodic (1 REQUIRES_FOLLOW_UP), 3 fit-to-work (1 restricted-duty BR-04, 1 reassessment due), 2 PAK case (SEVERE+CAPA+workflow, MILD), 2 kunjungan klinik, 1 program surveilans+2 enrollment, 2 subject request (REJECTED, ANONYMIZED BR-06).",
  );
}
