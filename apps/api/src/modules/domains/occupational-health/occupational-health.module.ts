import { Module } from "@nestjs/common";
import { FieldEncryptionModule } from "../../../platform/field-encryption/field-encryption.module";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { RbacModule } from "../../../platform/rbac/rbac.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { ClinicVisitLogService } from "./clinic-visit-log.service";
import { FitToWorkAssessmentService } from "./fit-to-work-assessment.service";
import { HealthDataConsentService } from "./health-data-consent.service";
import { HealthDataSubjectRequestService } from "./health-data-subject-request.service";
import { HealthSurveillanceProgramService } from "./health-surveillance-program.service";
import { McuReminderScanQueueService } from "./mcu-reminder-scan-queue.service";
import { McuReminderScanService } from "./mcu-reminder-scan.service";
import { McuResultService } from "./mcu-result.service";
import { McuScheduleService } from "./mcu-schedule.service";
import { MedicalRecordAccessLogService } from "./medical-record-access-log.service";
import { MedicalRecordService } from "./medical-record.service";
import { OccupationalDiseaseCaseService } from "./occupational-disease-case.service";
import { OccupationalDiseaseCaseWorkflowCompletionListener } from "./occupational-disease-case-workflow-completion.listener";
import { OccupationalHealthAccessControlService } from "./occupational-health-access-control.service";
import { OccupationalHealthAuthorizedUserService } from "./occupational-health-authorized-user.service";
import { OccupationalHealthReassessmentScanQueueService } from "./occupational-health-reassessment-scan-queue.service";
import { OccupationalHealthReassessmentScanService } from "./occupational-health-reassessment-scan.service";
import { OccupationalHealthWorkflowBootstrapService } from "./occupational-health-workflow-bootstrap.service";
import { RestrictedDutyAssignmentController } from "./restricted-duty-assignment.controller";
import { RestrictedDutyAssignmentService } from "./restricted-duty-assignment.service";

// Task 5.3 (Modul 13 Occupational Health) — modul DOMAIN KEDELAPAN BELAS,
// Phase 5 lanjut, dan PALING SENSITIF platform (lihat banner comment blok
// Modul 13 schema.prisma). SATU workflow_definitions (OH_PAK_CASE 2-stage
// — fit-to-work/MCU SENGAJA TIDAK pakai Workflow Engine). Mengimpor
// RbacModule (BARU — SCOPE_HIERARCHY_RESOLVER utk BR-02 dual-gate bagian b,
// lihat banner comment OccupationalHealthAccessControlService) DAN
// FieldEncryptionModule (BARU, platform/field-encryption, task 252) —
// KEDUA import platform ini PERTAMA KALINYA dipakai modul DOMAIN sesi ini
// (RbacModule sebelumnya cuma diimpor AppModule/modul lain via APP_GUARD,
// bukan disuntik langsung ke provider domain). TIDAK mengimpor
// CapaModule/UserRoleModule — CAPA-linkage occupational_disease_cases
// MANUAL via linkCapaRegister() (BR-10, CapaModule SENDIRI yang
// memvalidasi via query Prisma langsung, arah dependency SEARAH). BR-07
// (gate onboarding Modul 02) TIDAK di-wire nyata ke UserService — gap
// README eksplisit, BUKAN diabaikan diam-diam.
// DUA job cron baru (mcu-reminder-scan 06:45 PRD §8 baris 1,
// occupational-health-reassessment-scan 07:00 PRD §8 baris 5) — pola
// dobel-registrasi PERSIS Environmental 5.2/CAPA 4.2: *QueueService
// (producer) DAN *ScanService (consumer) SAMA-SAMA didaftarkan di sini
// SEKALIGUS di OccupationalHealthWorkerModule (apps/worker) — scan
// SERVICE-nya SENGAJA dobel, test harness (createTestApp()) TIDAK PERNAH
// boot worker module terpisah jadi butuh instance dari modul ini juga.
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule, RbacModule, FieldEncryptionModule],
  controllers: [RestrictedDutyAssignmentController],
  providers: [
    OccupationalHealthWorkflowBootstrapService,
    OccupationalHealthAccessControlService,
    MedicalRecordAccessLogService,
    MedicalRecordService,
    HealthDataConsentService,
    McuScheduleService,
    McuResultService,
    McuReminderScanQueueService,
    McuReminderScanService,
    FitToWorkAssessmentService,
    RestrictedDutyAssignmentService,
    OccupationalHealthReassessmentScanQueueService,
    OccupationalHealthReassessmentScanService,
    OccupationalDiseaseCaseService,
    OccupationalDiseaseCaseWorkflowCompletionListener,
    ClinicVisitLogService,
    HealthSurveillanceProgramService,
    OccupationalHealthAuthorizedUserService,
    HealthDataSubjectRequestService,
  ],
  exports: [
    MedicalRecordService,
    HealthDataConsentService,
    McuScheduleService,
    McuResultService,
    FitToWorkAssessmentService,
    RestrictedDutyAssignmentService,
    OccupationalDiseaseCaseService,
    ClinicVisitLogService,
    HealthSurveillanceProgramService,
    OccupationalHealthAuthorizedUserService,
    HealthDataSubjectRequestService,
  ],
})
export class OccupationalHealthModule {}
