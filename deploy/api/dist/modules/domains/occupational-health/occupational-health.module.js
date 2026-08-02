"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OccupationalHealthModule = void 0;
const common_1 = require("@nestjs/common");
const field_encryption_module_1 = require("../../../platform/field-encryption/field-encryption.module");
const notification_module_1 = require("../../../platform/notification/notification.module");
const numbering_module_1 = require("../../../platform/numbering/numbering.module");
const observability_module_1 = require("../../../platform/observability/observability.module");
const rbac_module_1 = require("../../../platform/rbac/rbac.module");
const tenancy_module_1 = require("../../../platform/tenancy/tenancy.module");
const workflow_engine_module_1 = require("../../../platform/workflow-engine/workflow-engine.module");
const clinic_visit_log_service_1 = require("./clinic-visit-log.service");
const fit_to_work_assessment_service_1 = require("./fit-to-work-assessment.service");
const health_data_consent_service_1 = require("./health-data-consent.service");
const health_data_subject_request_service_1 = require("./health-data-subject-request.service");
const health_surveillance_program_service_1 = require("./health-surveillance-program.service");
const mcu_reminder_scan_queue_service_1 = require("./mcu-reminder-scan-queue.service");
const mcu_reminder_scan_service_1 = require("./mcu-reminder-scan.service");
const mcu_result_service_1 = require("./mcu-result.service");
const mcu_schedule_service_1 = require("./mcu-schedule.service");
const medical_record_access_log_service_1 = require("./medical-record-access-log.service");
const medical_record_service_1 = require("./medical-record.service");
const occupational_disease_case_service_1 = require("./occupational-disease-case.service");
const occupational_disease_case_workflow_completion_listener_1 = require("./occupational-disease-case-workflow-completion.listener");
const occupational_health_access_control_service_1 = require("./occupational-health-access-control.service");
const occupational_health_authorized_user_service_1 = require("./occupational-health-authorized-user.service");
const occupational_health_reassessment_scan_queue_service_1 = require("./occupational-health-reassessment-scan-queue.service");
const occupational_health_reassessment_scan_service_1 = require("./occupational-health-reassessment-scan.service");
const occupational_health_workflow_bootstrap_service_1 = require("./occupational-health-workflow-bootstrap.service");
const restricted_duty_assignment_controller_1 = require("./restricted-duty-assignment.controller");
const restricted_duty_assignment_service_1 = require("./restricted-duty-assignment.service");
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
let OccupationalHealthModule = class OccupationalHealthModule {
};
exports.OccupationalHealthModule = OccupationalHealthModule;
exports.OccupationalHealthModule = OccupationalHealthModule = __decorate([
    (0, common_1.Module)({
        imports: [tenancy_module_1.TenancyModule, observability_module_1.ObservabilityModule, workflow_engine_module_1.WorkflowEngineModule, numbering_module_1.NumberingModule, notification_module_1.NotificationModule, rbac_module_1.RbacModule, field_encryption_module_1.FieldEncryptionModule],
        controllers: [restricted_duty_assignment_controller_1.RestrictedDutyAssignmentController],
        providers: [
            occupational_health_workflow_bootstrap_service_1.OccupationalHealthWorkflowBootstrapService,
            occupational_health_access_control_service_1.OccupationalHealthAccessControlService,
            medical_record_access_log_service_1.MedicalRecordAccessLogService,
            medical_record_service_1.MedicalRecordService,
            health_data_consent_service_1.HealthDataConsentService,
            mcu_schedule_service_1.McuScheduleService,
            mcu_result_service_1.McuResultService,
            mcu_reminder_scan_queue_service_1.McuReminderScanQueueService,
            mcu_reminder_scan_service_1.McuReminderScanService,
            fit_to_work_assessment_service_1.FitToWorkAssessmentService,
            restricted_duty_assignment_service_1.RestrictedDutyAssignmentService,
            occupational_health_reassessment_scan_queue_service_1.OccupationalHealthReassessmentScanQueueService,
            occupational_health_reassessment_scan_service_1.OccupationalHealthReassessmentScanService,
            occupational_disease_case_service_1.OccupationalDiseaseCaseService,
            occupational_disease_case_workflow_completion_listener_1.OccupationalDiseaseCaseWorkflowCompletionListener,
            clinic_visit_log_service_1.ClinicVisitLogService,
            health_surveillance_program_service_1.HealthSurveillanceProgramService,
            occupational_health_authorized_user_service_1.OccupationalHealthAuthorizedUserService,
            health_data_subject_request_service_1.HealthDataSubjectRequestService,
        ],
        exports: [
            medical_record_service_1.MedicalRecordService,
            health_data_consent_service_1.HealthDataConsentService,
            mcu_schedule_service_1.McuScheduleService,
            mcu_result_service_1.McuResultService,
            fit_to_work_assessment_service_1.FitToWorkAssessmentService,
            restricted_duty_assignment_service_1.RestrictedDutyAssignmentService,
            occupational_disease_case_service_1.OccupationalDiseaseCaseService,
            clinic_visit_log_service_1.ClinicVisitLogService,
            health_surveillance_program_service_1.HealthSurveillanceProgramService,
            occupational_health_authorized_user_service_1.OccupationalHealthAuthorizedUserService,
            health_data_subject_request_service_1.HealthDataSubjectRequestService,
        ],
    })
], OccupationalHealthModule);
//# sourceMappingURL=occupational-health.module.js.map