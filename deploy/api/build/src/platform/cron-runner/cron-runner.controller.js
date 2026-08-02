"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronRunnerController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../auth/public.decorator");
const notification_poll_service_1 = require("../notification/notification-poll.service");
const attachment_poll_service_1 = require("../attachment/attachment-poll.service");
const redis_enabled_helper_1 = require("../scheduling/redis-enabled.helper");
const workflow_sla_scan_service_1 = require("../workflow-engine/workflow-sla-scan.service");
const audit_log_partition_maintenance_service_1 = require("../audit-log/audit-log-partition-maintenance.service");
const reminder_scan_service_1 = require("../../modules/domains/organization/reminder-scan.service");
const delegation_scan_service_1 = require("../../modules/domains/user-role/delegation/delegation-scan.service");
const usage_counter_scan_service_1 = require("../../modules/domains/system-administration/provisioning/usage-counter-scan.service");
const document_review_scan_service_1 = require("../../modules/domains/dms/document-review-scan.service");
const read_acknowledgement_scan_service_1 = require("../../modules/domains/dms/read-acknowledgement-scan.service");
const license_expiry_scan_service_1 = require("../../modules/domains/regulatory-compliance/license-expiry-scan.service");
const obligation_due_scan_service_1 = require("../../modules/domains/regulatory-compliance/obligation-due-scan.service");
const hiradc_expiry_scan_service_1 = require("../../modules/domains/risk-management/hira-jsa-hiradc/hiradc-expiry-scan.service");
const risk_register_review_scan_service_1 = require("../../modules/domains/risk-management/hira-jsa-hiradc/risk-register-review-scan.service");
const hira_review_due_scan_service_1 = require("../../modules/domains/risk-management/hira-jsa-hiradc/hira-review-due-scan.service");
const work_permit_expiry_scan_service_1 = require("../../modules/domains/work-permit/work-permit-expiry-scan.service");
const gas_retest_due_scan_service_1 = require("../../modules/domains/work-permit/gas-retest-due-scan.service");
const incident_regulatory_report_overdue_scan_service_1 = require("../../modules/domains/incident/incident-regulatory-report-overdue-scan.service");
const incident_statistics_recalc_scan_service_1 = require("../../modules/domains/incident/incident-statistics-recalc-scan.service");
const inspection_record_generation_scan_service_1 = require("../../modules/domains/inspection/inspection-record-generation-scan.service");
const inspection_record_overdue_scan_service_1 = require("../../modules/domains/inspection/inspection-record-overdue-scan.service");
const inspection_finding_sla_scan_service_1 = require("../../modules/domains/inspection/inspection-finding-sla-scan.service");
const emergency_plan_review_overdue_scan_service_1 = require("../../modules/domains/emergency-response/emergency-plan-review-overdue-scan.service");
const auditor_competency_expiry_scan_service_1 = require("../../modules/domains/audit/auditor-competency-expiry-scan.service");
const audit_finding_closure_due_scan_service_1 = require("../../modules/domains/audit/audit-finding-closure-due-scan.service");
const capa_root_cause_sla_scan_service_1 = require("../../modules/domains/capa/capa-root-cause-sla-scan.service");
const capa_effectiveness_verification_due_scan_service_1 = require("../../modules/domains/capa/capa-effectiveness-verification-due-scan.service");
const quality_complaint_response_sla_scan_service_1 = require("../../modules/domains/quality/quality-complaint-response-sla-scan.service");
const waste_storage_duration_scan_service_1 = require("../../modules/domains/environmental/waste-storage-duration-scan.service");
const mcu_reminder_scan_service_1 = require("../../modules/domains/occupational-health/mcu-reminder-scan.service");
const occupational_health_reassessment_scan_service_1 = require("../../modules/domains/occupational-health/occupational-health-reassessment-scan.service");
const maintenance_due_scan_service_1 = require("../../modules/domains/asset-equipment/maintenance-due-scan.service");
const calibration_due_scan_service_1 = require("../../modules/domains/calibration/calibration-due-scan.service");
const contractor_due_scan_service_1 = require("../../modules/domains/contractor/contractor-due-scan.service");
const data_import_poll_service_1 = require("../../modules/domains/system-administration/data-import/data-import-poll.service");
// Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti 31 BullMQ
// repeatable job. cPanel Cron Job memanggil POST /internal/cron/run-scans
// tiap N menit (panduan deployment merekomendasikan 5-15 menit). SEMUA scan
// idempoten-by-design (lihat banner comment contractor-due-scan.service.ts
// dan seluruh *-scan.service.ts sejenis — "mark as sent"/status-transition
// kolom dicek SEBELUM enqueue notifikasi, jadi aman dipanggil berkali-kali
// lebih sering dari jadwal BullMQ aslinya, TIDAK ada kondisi balapan yang
// merusak data). Endpoint ini @Public() (bypass JwtAuthGuard/tenant
// middleware/RbacModule/EntitlementGuard — TIDAK ada user/tenant/JWT
// sungguhan di request cron) — proteksi SATU-SATUNYA lapisan di sini adalah
// header X-Cron-Secret dicocokkan CRON_SECRET (fail-closed: kalau
// CRON_SECRET tidak diset sama sekali di env, endpoint MENOLAK SEMUA
// request, bukan default terbuka).
let CronRunnerController = class CronRunnerController {
    workflowSlaScan;
    auditLogPartitionMaintenance;
    reminderScan;
    delegationScan;
    usageCounterScan;
    documentReviewScan;
    readAcknowledgementScan;
    licenseExpiryScan;
    obligationDueScan;
    hiradcExpiryScan;
    riskRegisterReviewScan;
    hiraReviewDueScan;
    workPermitExpiryScan;
    gasRetestDueScan;
    incidentRegulatoryReportOverdueScan;
    incidentStatisticsRecalcScan;
    inspectionRecordGenerationScan;
    inspectionRecordOverdueScan;
    inspectionFindingSlaScan;
    emergencyPlanReviewOverdueScan;
    auditorCompetencyExpiryScan;
    auditFindingClosureDueScan;
    capaRootCauseSlaScan;
    capaEffectivenessVerificationDueScan;
    qualityComplaintResponseSlaScan;
    wasteStorageDurationScan;
    mcuReminderScan;
    occupationalHealthReassessmentScan;
    maintenanceDueScan;
    calibrationDueScan;
    contractorDueScan;
    notificationPoll;
    attachmentPoll;
    dataImportPoll;
    constructor(workflowSlaScan, auditLogPartitionMaintenance, reminderScan, delegationScan, usageCounterScan, documentReviewScan, readAcknowledgementScan, licenseExpiryScan, obligationDueScan, hiradcExpiryScan, riskRegisterReviewScan, hiraReviewDueScan, workPermitExpiryScan, gasRetestDueScan, incidentRegulatoryReportOverdueScan, incidentStatisticsRecalcScan, inspectionRecordGenerationScan, inspectionRecordOverdueScan, inspectionFindingSlaScan, emergencyPlanReviewOverdueScan, auditorCompetencyExpiryScan, auditFindingClosureDueScan, capaRootCauseSlaScan, capaEffectivenessVerificationDueScan, qualityComplaintResponseSlaScan, wasteStorageDurationScan, mcuReminderScan, occupationalHealthReassessmentScan, maintenanceDueScan, calibrationDueScan, contractorDueScan, notificationPoll, attachmentPoll, dataImportPoll) {
        this.workflowSlaScan = workflowSlaScan;
        this.auditLogPartitionMaintenance = auditLogPartitionMaintenance;
        this.reminderScan = reminderScan;
        this.delegationScan = delegationScan;
        this.usageCounterScan = usageCounterScan;
        this.documentReviewScan = documentReviewScan;
        this.readAcknowledgementScan = readAcknowledgementScan;
        this.licenseExpiryScan = licenseExpiryScan;
        this.obligationDueScan = obligationDueScan;
        this.hiradcExpiryScan = hiradcExpiryScan;
        this.riskRegisterReviewScan = riskRegisterReviewScan;
        this.hiraReviewDueScan = hiraReviewDueScan;
        this.workPermitExpiryScan = workPermitExpiryScan;
        this.gasRetestDueScan = gasRetestDueScan;
        this.incidentRegulatoryReportOverdueScan = incidentRegulatoryReportOverdueScan;
        this.incidentStatisticsRecalcScan = incidentStatisticsRecalcScan;
        this.inspectionRecordGenerationScan = inspectionRecordGenerationScan;
        this.inspectionRecordOverdueScan = inspectionRecordOverdueScan;
        this.inspectionFindingSlaScan = inspectionFindingSlaScan;
        this.emergencyPlanReviewOverdueScan = emergencyPlanReviewOverdueScan;
        this.auditorCompetencyExpiryScan = auditorCompetencyExpiryScan;
        this.auditFindingClosureDueScan = auditFindingClosureDueScan;
        this.capaRootCauseSlaScan = capaRootCauseSlaScan;
        this.capaEffectivenessVerificationDueScan = capaEffectivenessVerificationDueScan;
        this.qualityComplaintResponseSlaScan = qualityComplaintResponseSlaScan;
        this.wasteStorageDurationScan = wasteStorageDurationScan;
        this.mcuReminderScan = mcuReminderScan;
        this.occupationalHealthReassessmentScan = occupationalHealthReassessmentScan;
        this.maintenanceDueScan = maintenanceDueScan;
        this.calibrationDueScan = calibrationDueScan;
        this.contractorDueScan = contractorDueScan;
        this.notificationPoll = notificationPoll;
        this.attachmentPoll = attachmentPoll;
        this.dataImportPoll = dataImportPoll;
    }
    buildRegistry() {
        return [
            { name: "notification-poll", run: () => this.notificationPoll.tick() },
            { name: "attachment-poll", run: () => this.attachmentPoll.tick() },
            { name: "data-import-poll", run: () => this.dataImportPoll.tick() },
            { name: "workflow-sla-scan", run: () => this.workflowSlaScan.scan() },
            { name: "audit-log-partition-maintenance", run: () => this.auditLogPartitionMaintenance.run() },
            { name: "reminder-scan", run: () => this.reminderScan.scan() },
            { name: "delegation-scan", run: () => this.delegationScan.scan() },
            { name: "usage-counter-scan", run: () => this.usageCounterScan.scan() },
            { name: "document-review-scan", run: () => this.documentReviewScan.scan() },
            { name: "read-acknowledgement-scan", run: () => this.readAcknowledgementScan.scan() },
            { name: "license-expiry-scan", run: () => this.licenseExpiryScan.scan() },
            { name: "obligation-due-scan", run: () => this.obligationDueScan.scan() },
            { name: "hiradc-expiry-scan", run: () => this.hiradcExpiryScan.scan() },
            { name: "risk-register-review-scan", run: () => this.riskRegisterReviewScan.scan() },
            { name: "hira-review-due-scan", run: () => this.hiraReviewDueScan.scan() },
            { name: "work-permit-expiry-scan", run: () => this.workPermitExpiryScan.scan() },
            { name: "gas-retest-due-scan", run: () => this.gasRetestDueScan.scan() },
            { name: "incident-regulatory-report-overdue-scan", run: () => this.incidentRegulatoryReportOverdueScan.scan() },
            { name: "incident-statistics-recalc-scan", run: () => this.incidentStatisticsRecalcScan.scan() },
            { name: "inspection-record-generation-scan", run: () => this.inspectionRecordGenerationScan.scan() },
            { name: "inspection-record-overdue-scan", run: () => this.inspectionRecordOverdueScan.scan() },
            { name: "inspection-finding-sla-scan", run: () => this.inspectionFindingSlaScan.scan() },
            { name: "emergency-plan-review-overdue-scan", run: () => this.emergencyPlanReviewOverdueScan.scan() },
            { name: "auditor-competency-expiry-scan", run: () => this.auditorCompetencyExpiryScan.scan() },
            { name: "audit-finding-closure-due-scan", run: () => this.auditFindingClosureDueScan.scan() },
            { name: "capa-root-cause-sla-scan", run: () => this.capaRootCauseSlaScan.scan() },
            { name: "capa-effectiveness-verification-due-scan", run: () => this.capaEffectivenessVerificationDueScan.scan() },
            { name: "quality-complaint-response-sla-scan", run: () => this.qualityComplaintResponseSlaScan.scan() },
            { name: "waste-storage-duration-scan", run: () => this.wasteStorageDurationScan.scan() },
            { name: "mcu-reminder-scan", run: () => this.mcuReminderScan.scan() },
            { name: "occupational-health-reassessment-scan", run: () => this.occupationalHealthReassessmentScan.scan() },
            { name: "maintenance-due-scan", run: () => this.maintenanceDueScan.scan() },
            { name: "calibration-due-scan", run: () => this.calibrationDueScan.scan() },
            { name: "contractor-due-scan", run: () => this.contractorDueScan.scan() },
        ];
    }
    assertCronSecret(providedSecret) {
        const expected = process.env.CRON_SECRET;
        if (!expected || !providedSecret || providedSecret !== expected) {
            throw new common_1.UnauthorizedException("X-Cron-Secret tidak valid atau CRON_SECRET belum dikonfigurasi.");
        }
    }
    // Status publik TANPA secret — sengaja tidak membocorkan apa pun sensitif
    // (cuma boolean mode), dipakai panduan troubleshooting utk verifikasi cron
    // job mencapai server sama sekali sebelum debug lebih jauh.
    status() {
        return {
            redisEnabled: (0, redis_enabled_helper_1.isRedisEnabled)(),
            cronSecretConfigured: Boolean(process.env.CRON_SECRET),
            serverTime: new Date().toISOString(),
        };
    }
    async runScans(providedSecret) {
        this.assertCronSecret(providedSecret);
        const results = [];
        for (const entry of this.buildRegistry()) {
            const startedAt = Date.now();
            try {
                await entry.run();
                results.push({ name: entry.name, ok: true, ms: Date.now() - startedAt });
            }
            catch (err) {
                results.push({
                    name: entry.name,
                    ok: false,
                    ms: Date.now() - startedAt,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
        return { ranAt: new Date().toISOString(), results };
    }
};
exports.CronRunnerController = CronRunnerController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)("status"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CronRunnerController.prototype, "status", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)("run-scans"),
    __param(0, (0, common_1.Headers)("x-cron-secret")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CronRunnerController.prototype, "runScans", null);
exports.CronRunnerController = CronRunnerController = __decorate([
    (0, common_1.Controller)("internal/cron"),
    __metadata("design:paramtypes", [workflow_sla_scan_service_1.WorkflowSlaScanService,
        audit_log_partition_maintenance_service_1.AuditLogPartitionMaintenanceService,
        reminder_scan_service_1.ReminderScanService,
        delegation_scan_service_1.DelegationScanService,
        usage_counter_scan_service_1.UsageCounterScanService,
        document_review_scan_service_1.DocumentReviewScanService,
        read_acknowledgement_scan_service_1.ReadAcknowledgementScanService,
        license_expiry_scan_service_1.LicenseExpiryScanService,
        obligation_due_scan_service_1.ObligationDueScanService,
        hiradc_expiry_scan_service_1.HiradcExpiryScanService,
        risk_register_review_scan_service_1.RiskRegisterReviewScanService,
        hira_review_due_scan_service_1.HiraReviewDueScanService,
        work_permit_expiry_scan_service_1.WorkPermitExpiryScanService,
        gas_retest_due_scan_service_1.GasRetestDueScanService,
        incident_regulatory_report_overdue_scan_service_1.IncidentRegulatoryReportOverdueScanService,
        incident_statistics_recalc_scan_service_1.IncidentStatisticsRecalcScanService,
        inspection_record_generation_scan_service_1.InspectionRecordGenerationScanService,
        inspection_record_overdue_scan_service_1.InspectionRecordOverdueScanService,
        inspection_finding_sla_scan_service_1.InspectionFindingSlaScanService,
        emergency_plan_review_overdue_scan_service_1.EmergencyPlanReviewOverdueScanService,
        auditor_competency_expiry_scan_service_1.AuditorCompetencyExpiryScanService,
        audit_finding_closure_due_scan_service_1.AuditFindingClosureDueScanService,
        capa_root_cause_sla_scan_service_1.CapaRootCauseSlaScanService,
        capa_effectiveness_verification_due_scan_service_1.CapaEffectivenessVerificationDueScanService,
        quality_complaint_response_sla_scan_service_1.QualityComplaintResponseSlaScanService,
        waste_storage_duration_scan_service_1.WasteStorageDurationScanService,
        mcu_reminder_scan_service_1.McuReminderScanService,
        occupational_health_reassessment_scan_service_1.OccupationalHealthReassessmentScanService,
        maintenance_due_scan_service_1.MaintenanceDueScanService,
        calibration_due_scan_service_1.CalibrationDueScanService,
        contractor_due_scan_service_1.ContractorDueScanService,
        notification_poll_service_1.NotificationPollService,
        attachment_poll_service_1.AttachmentPollService,
        data_import_poll_service_1.DataImportPollService])
], CronRunnerController);
