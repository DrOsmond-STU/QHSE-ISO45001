import { Controller, Get, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { NotificationPollService } from "../notification/notification-poll.service";
import { AttachmentPollService } from "../attachment/attachment-poll.service";
import { isRedisEnabled } from "../scheduling/redis-enabled.helper";
import { WorkflowSlaScanService } from "../workflow-engine/workflow-sla-scan.service";
import { AuditLogPartitionMaintenanceService } from "../audit-log/audit-log-partition-maintenance.service";
import { ReminderScanService } from "../../modules/domains/organization/reminder-scan.service";
import { DelegationScanService } from "../../modules/domains/user-role/delegation/delegation-scan.service";
import { UsageCounterScanService } from "../../modules/domains/system-administration/provisioning/usage-counter-scan.service";
import { DocumentReviewScanService } from "../../modules/domains/dms/document-review-scan.service";
import { ReadAcknowledgementScanService } from "../../modules/domains/dms/read-acknowledgement-scan.service";
import { LicenseExpiryScanService } from "../../modules/domains/regulatory-compliance/license-expiry-scan.service";
import { ObligationDueScanService } from "../../modules/domains/regulatory-compliance/obligation-due-scan.service";
import { HiradcExpiryScanService } from "../../modules/domains/risk-management/hira-jsa-hiradc/hiradc-expiry-scan.service";
import { RiskRegisterReviewScanService } from "../../modules/domains/risk-management/hira-jsa-hiradc/risk-register-review-scan.service";
import { HiraReviewDueScanService } from "../../modules/domains/risk-management/hira-jsa-hiradc/hira-review-due-scan.service";
import { WorkPermitExpiryScanService } from "../../modules/domains/work-permit/work-permit-expiry-scan.service";
import { GasRetestDueScanService } from "../../modules/domains/work-permit/gas-retest-due-scan.service";
import { IncidentRegulatoryReportOverdueScanService } from "../../modules/domains/incident/incident-regulatory-report-overdue-scan.service";
import { IncidentStatisticsRecalcScanService } from "../../modules/domains/incident/incident-statistics-recalc-scan.service";
import { InspectionRecordGenerationScanService } from "../../modules/domains/inspection/inspection-record-generation-scan.service";
import { InspectionRecordOverdueScanService } from "../../modules/domains/inspection/inspection-record-overdue-scan.service";
import { InspectionFindingSlaScanService } from "../../modules/domains/inspection/inspection-finding-sla-scan.service";
import { EmergencyPlanReviewOverdueScanService } from "../../modules/domains/emergency-response/emergency-plan-review-overdue-scan.service";
import { AuditorCompetencyExpiryScanService } from "../../modules/domains/audit/auditor-competency-expiry-scan.service";
import { AuditFindingClosureDueScanService } from "../../modules/domains/audit/audit-finding-closure-due-scan.service";
import { CapaRootCauseSlaScanService } from "../../modules/domains/capa/capa-root-cause-sla-scan.service";
import { CapaEffectivenessVerificationDueScanService } from "../../modules/domains/capa/capa-effectiveness-verification-due-scan.service";
import { QualityComplaintResponseSlaScanService } from "../../modules/domains/quality/quality-complaint-response-sla-scan.service";
import { WasteStorageDurationScanService } from "../../modules/domains/environmental/waste-storage-duration-scan.service";
import { McuReminderScanService } from "../../modules/domains/occupational-health/mcu-reminder-scan.service";
import { OccupationalHealthReassessmentScanService } from "../../modules/domains/occupational-health/occupational-health-reassessment-scan.service";
import { MaintenanceDueScanService } from "../../modules/domains/asset-equipment/maintenance-due-scan.service";
import { CalibrationDueScanService } from "../../modules/domains/calibration/calibration-due-scan.service";
import { ContractorDueScanService } from "../../modules/domains/contractor/contractor-due-scan.service";
import { DataImportPollService } from "../../modules/domains/system-administration/data-import/data-import-poll.service";

interface ScanEntry {
  name: string;
  run: () => Promise<void>;
}

interface ScanResult {
  name: string;
  ok: boolean;
  ms: number;
  error?: string;
}

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
@Controller("internal/cron")
export class CronRunnerController {
  constructor(
    private readonly workflowSlaScan: WorkflowSlaScanService,
    private readonly auditLogPartitionMaintenance: AuditLogPartitionMaintenanceService,
    private readonly reminderScan: ReminderScanService,
    private readonly delegationScan: DelegationScanService,
    private readonly usageCounterScan: UsageCounterScanService,
    private readonly documentReviewScan: DocumentReviewScanService,
    private readonly readAcknowledgementScan: ReadAcknowledgementScanService,
    private readonly licenseExpiryScan: LicenseExpiryScanService,
    private readonly obligationDueScan: ObligationDueScanService,
    private readonly hiradcExpiryScan: HiradcExpiryScanService,
    private readonly riskRegisterReviewScan: RiskRegisterReviewScanService,
    private readonly hiraReviewDueScan: HiraReviewDueScanService,
    private readonly workPermitExpiryScan: WorkPermitExpiryScanService,
    private readonly gasRetestDueScan: GasRetestDueScanService,
    private readonly incidentRegulatoryReportOverdueScan: IncidentRegulatoryReportOverdueScanService,
    private readonly incidentStatisticsRecalcScan: IncidentStatisticsRecalcScanService,
    private readonly inspectionRecordGenerationScan: InspectionRecordGenerationScanService,
    private readonly inspectionRecordOverdueScan: InspectionRecordOverdueScanService,
    private readonly inspectionFindingSlaScan: InspectionFindingSlaScanService,
    private readonly emergencyPlanReviewOverdueScan: EmergencyPlanReviewOverdueScanService,
    private readonly auditorCompetencyExpiryScan: AuditorCompetencyExpiryScanService,
    private readonly auditFindingClosureDueScan: AuditFindingClosureDueScanService,
    private readonly capaRootCauseSlaScan: CapaRootCauseSlaScanService,
    private readonly capaEffectivenessVerificationDueScan: CapaEffectivenessVerificationDueScanService,
    private readonly qualityComplaintResponseSlaScan: QualityComplaintResponseSlaScanService,
    private readonly wasteStorageDurationScan: WasteStorageDurationScanService,
    private readonly mcuReminderScan: McuReminderScanService,
    private readonly occupationalHealthReassessmentScan: OccupationalHealthReassessmentScanService,
    private readonly maintenanceDueScan: MaintenanceDueScanService,
    private readonly calibrationDueScan: CalibrationDueScanService,
    private readonly contractorDueScan: ContractorDueScanService,
    private readonly notificationPoll: NotificationPollService,
    private readonly attachmentPoll: AttachmentPollService,
    private readonly dataImportPoll: DataImportPollService,
  ) {}

  private buildRegistry(): ScanEntry[] {
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

  private assertCronSecret(providedSecret: string | undefined): void {
    const expected = process.env.CRON_SECRET;
    if (!expected || !providedSecret || providedSecret !== expected) {
      throw new UnauthorizedException("X-Cron-Secret tidak valid atau CRON_SECRET belum dikonfigurasi.");
    }
  }

  // Status publik TANPA secret — sengaja tidak membocorkan apa pun sensitif
  // (cuma boolean mode), dipakai panduan troubleshooting utk verifikasi cron
  // job mencapai server sama sekali sebelum debug lebih jauh.
  @Public()
  @Get("status")
  status() {
    return {
      redisEnabled: isRedisEnabled(),
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
      serverTime: new Date().toISOString(),
    };
  }

  @Public()
  @Post("run-scans")
  async runScans(@Headers("x-cron-secret") providedSecret: string | undefined): Promise<{ ranAt: string; results: ScanResult[] }> {
    this.assertCronSecret(providedSecret);

    const results: ScanResult[] = [];
    for (const entry of this.buildRegistry()) {
      const startedAt = Date.now();
      try {
        await entry.run();
        results.push({ name: entry.name, ok: true, ms: Date.now() - startedAt });
      } catch (err) {
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
}
