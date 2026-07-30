import "reflect-metadata";
import {
  AuditLogPartitionMaintenanceWorkerHandle,
  bootstrapAuditLogPartitionMaintenanceWorker,
} from "./audit-log-partition-maintenance.worker";
import { AttachmentScanWorkerHandle, bootstrapAttachmentScanWorker } from "./attachment-scan.worker";
import { bootstrapDataImportWorker, DataImportWorkerHandle } from "./data-import.worker";
import { bootstrapDelegationScanWorker, DelegationScanWorkerHandle } from "./delegation-scan.worker";
import { bootstrapDocumentReviewScanWorker, DocumentReviewScanWorkerHandle } from "./document-review-scan.worker";
import { bootstrapGasRetestDueScanWorker, GasRetestDueScanWorkerHandle } from "./gas-retest-due-scan.worker";
import { bootstrapHiraReviewDueScanWorker, HiraReviewDueScanWorkerHandle } from "./hira-review-due-scan.worker";
import { bootstrapHiradcExpiryScanWorker, HiradcExpiryScanWorkerHandle } from "./hiradc-expiry-scan.worker";
import {
  bootstrapIncidentRegulatoryReportOverdueScanWorker,
  IncidentRegulatoryReportOverdueScanWorkerHandle,
} from "./incident-regulatory-report-overdue-scan.worker";
import {
  bootstrapEmergencyPlanReviewOverdueScanWorker,
  EmergencyPlanReviewOverdueScanWorkerHandle,
} from "./emergency-plan-review-overdue-scan.worker";
import {
  bootstrapAuditorCompetencyExpiryScanWorker,
  AuditorCompetencyExpiryScanWorkerHandle,
} from "./auditor-competency-expiry-scan.worker";
import {
  bootstrapAuditFindingClosureDueScanWorker,
  AuditFindingClosureDueScanWorkerHandle,
} from "./audit-finding-closure-due-scan.worker";
import {
  bootstrapCapaRootCauseSlaScanWorker,
  CapaRootCauseSlaScanWorkerHandle,
} from "./capa-root-cause-sla-scan.worker";
import {
  bootstrapCapaEffectivenessVerificationDueScanWorker,
  CapaEffectivenessVerificationDueScanWorkerHandle,
} from "./capa-effectiveness-verification-due-scan.worker";
import {
  bootstrapQualityComplaintResponseSlaScanWorker,
  QualityComplaintResponseSlaScanWorkerHandle,
} from "./quality-complaint-response-sla-scan.worker";
import {
  bootstrapWasteStorageDurationScanWorker,
  WasteStorageDurationScanWorkerHandle,
} from "./waste-storage-duration-scan.worker";
import { bootstrapMcuReminderScanWorker, McuReminderScanWorkerHandle } from "./mcu-reminder-scan.worker";
import {
  bootstrapOccupationalHealthReassessmentScanWorker,
  OccupationalHealthReassessmentScanWorkerHandle,
} from "./occupational-health-reassessment-scan.worker";
import { bootstrapMaintenanceDueScanWorker, MaintenanceDueScanWorkerHandle } from "./maintenance-due-scan.worker";
import { bootstrapCalibrationDueScanWorker, CalibrationDueScanWorkerHandle } from "./calibration-due-scan.worker";
import { bootstrapContractorDueScanWorker, ContractorDueScanWorkerHandle } from "./contractor-due-scan.worker";
import {
  bootstrapIncidentStatisticsRecalcScanWorker,
  IncidentStatisticsRecalcScanWorkerHandle,
} from "./incident-statistics-recalc-scan.worker";
import {
  bootstrapInspectionFindingSlaScanWorker,
  InspectionFindingSlaScanWorkerHandle,
} from "./inspection-finding-sla-scan.worker";
import {
  bootstrapInspectionRecordGenerationScanWorker,
  InspectionRecordGenerationScanWorkerHandle,
} from "./inspection-record-generation-scan.worker";
import {
  bootstrapInspectionRecordOverdueScanWorker,
  InspectionRecordOverdueScanWorkerHandle,
} from "./inspection-record-overdue-scan.worker";
import { bootstrapLicenseExpiryScanWorker, LicenseExpiryScanWorkerHandle } from "./license-expiry-scan.worker";
import { bootstrapNotificationWorker, NotificationWorkerHandle } from "./notification.worker";
import { bootstrapObligationDueScanWorker, ObligationDueScanWorkerHandle } from "./obligation-due-scan.worker";
import {
  bootstrapReadAcknowledgementScanWorker,
  ReadAcknowledgementScanWorkerHandle,
} from "./read-acknowledgement-scan.worker";
import { bootstrapReminderScanWorker, ReminderScanWorkerHandle } from "./reminder-scan.worker";
import {
  bootstrapRiskRegisterReviewScanWorker,
  RiskRegisterReviewScanWorkerHandle,
} from "./risk-register-review-scan.worker";
import { bootstrapUsageCounterScanWorker, UsageCounterScanWorkerHandle } from "./usage-counter-scan.worker";
import { bootstrapWorkflowSlaScanWorker, WorkflowSlaScanWorkerHandle } from "./workflow-sla-scan.worker";
import { bootstrapWorkPermitExpiryScanWorker, WorkPermitExpiryScanWorkerHandle } from "./work-permit-expiry-scan.worker";

// Worker proses terpisah, konsumen BullMQ (TDD §3.1). Task 0.9 — konsumen
// workflow-sla-scan pertama. Task 0.11 (notifikasi), 0.12 (attachment
// scan), 0.13 (audit-log-partition-maintenance), 1.1 (reminder-scan), 1.4
// (delegation-scan), 1.5 (usage-counter-scan), 1.6 (data-import), 2.1
// (document-review-scan, read-acknowledgement-scan) & 2.2 (license-expiry-scan,
// obligation-due-scan) menambah konsumen lain di file terpisah dengan pola
// yang sama.
async function bootstrap() {
  const workflowSlaScan = await bootstrapWorkflowSlaScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] workflow-sla-scan consumer siap.");

  const notification = await bootstrapNotificationWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] notification-queue consumer siap.");

  const attachmentScan = await bootstrapAttachmentScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] attachment-scan consumer siap.");

  const auditLogPartitionMaintenance = await bootstrapAuditLogPartitionMaintenanceWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] audit-log-partition-maintenance consumer siap.");

  const reminderScan = await bootstrapReminderScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] reminder-scan consumer siap.");

  const delegationScan = await bootstrapDelegationScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] delegation-scan consumer siap.");

  const usageCounterScan = await bootstrapUsageCounterScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] usage-counter-scan consumer siap.");

  const dataImport = await bootstrapDataImportWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] data-import consumer siap.");

  const documentReviewScan = await bootstrapDocumentReviewScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] document-review-scan consumer siap.");

  const readAcknowledgementScan = await bootstrapReadAcknowledgementScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] read-acknowledgement-scan consumer siap.");

  const licenseExpiryScan = await bootstrapLicenseExpiryScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] license-expiry-scan consumer siap.");

  const obligationDueScan = await bootstrapObligationDueScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] obligation-due-scan consumer siap.");

  const hiradcExpiryScan = await bootstrapHiradcExpiryScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] hiradc-expiry-scan consumer siap.");

  const riskRegisterReviewScan = await bootstrapRiskRegisterReviewScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] risk-register-review-scan consumer siap.");

  const hiraReviewDueScan = await bootstrapHiraReviewDueScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] hira-review-due-scan consumer siap.");

  const workPermitExpiryScan = await bootstrapWorkPermitExpiryScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] work-permit-expiry-scan consumer siap.");

  const gasRetestDueScan = await bootstrapGasRetestDueScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] gas-retest-due-scan consumer siap.");

  const incidentRegulatoryReportOverdueScan = await bootstrapIncidentRegulatoryReportOverdueScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] incident-regulatory-report-overdue-scan consumer siap.");

  const incidentStatisticsRecalcScan = await bootstrapIncidentStatisticsRecalcScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] incident-statistics-recalc-scan consumer siap.");

  const inspectionRecordGenerationScan = await bootstrapInspectionRecordGenerationScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] inspection-record-generation-scan consumer siap.");

  const inspectionRecordOverdueScan = await bootstrapInspectionRecordOverdueScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] inspection-record-overdue-scan consumer siap.");

  const inspectionFindingSlaScan = await bootstrapInspectionFindingSlaScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] inspection-finding-sla-scan consumer siap.");

  const emergencyPlanReviewOverdueScan = await bootstrapEmergencyPlanReviewOverdueScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] emergency-plan-review-overdue-scan consumer siap.");

  const auditorCompetencyExpiryScan = await bootstrapAuditorCompetencyExpiryScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] auditor-competency-expiry-scan consumer siap.");

  const auditFindingClosureDueScan = await bootstrapAuditFindingClosureDueScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] audit-finding-closure-due-scan consumer siap.");

  const capaRootCauseSlaScan = await bootstrapCapaRootCauseSlaScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] capa-root-cause-sla-scan consumer siap.");

  const capaEffectivenessVerificationDueScan = await bootstrapCapaEffectivenessVerificationDueScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] capa-effectiveness-verification-due-scan consumer siap.");

  const qualityComplaintResponseSlaScan = await bootstrapQualityComplaintResponseSlaScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] quality-complaint-response-sla-scan consumer siap.");

  const wasteStorageDurationScan = await bootstrapWasteStorageDurationScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] waste-storage-duration-scan consumer siap.");

  const mcuReminderScan = await bootstrapMcuReminderScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] mcu-reminder-scan consumer siap.");

  const occupationalHealthReassessmentScan = await bootstrapOccupationalHealthReassessmentScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] occupational-health-reassessment-scan consumer siap.");

  const maintenanceDueScan = await bootstrapMaintenanceDueScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] maintenance-due-scan consumer siap.");

  const calibrationDueScan = await bootstrapCalibrationDueScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] calibration-due-scan consumer siap.");

  const contractorDueScan = await bootstrapContractorDueScanWorker();
  // eslint-disable-next-line no-console
  console.log("[qhse-worker] contractor-due-scan consumer siap.");

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[qhse-worker] ${signal} diterima, graceful shutdown...`);
    await closeAll(
      workflowSlaScan,
      notification,
      attachmentScan,
      auditLogPartitionMaintenance,
      reminderScan,
      delegationScan,
      usageCounterScan,
      dataImport,
      documentReviewScan,
      readAcknowledgementScan,
      licenseExpiryScan,
      obligationDueScan,
      hiradcExpiryScan,
      riskRegisterReviewScan,
      hiraReviewDueScan,
      workPermitExpiryScan,
      gasRetestDueScan,
      incidentRegulatoryReportOverdueScan,
      incidentStatisticsRecalcScan,
      inspectionRecordGenerationScan,
      inspectionRecordOverdueScan,
      inspectionFindingSlaScan,
      emergencyPlanReviewOverdueScan,
      auditorCompetencyExpiryScan,
      auditFindingClosureDueScan,
      capaRootCauseSlaScan,
      capaEffectivenessVerificationDueScan,
      qualityComplaintResponseSlaScan,
      wasteStorageDurationScan,
      mcuReminderScan,
      occupationalHealthReassessmentScan,
      maintenanceDueScan,
      calibrationDueScan,
      contractorDueScan,
    );
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

async function closeAll(
  workflowSlaScan: WorkflowSlaScanWorkerHandle,
  notification: NotificationWorkerHandle,
  attachmentScan: AttachmentScanWorkerHandle,
  auditLogPartitionMaintenance: AuditLogPartitionMaintenanceWorkerHandle,
  reminderScan: ReminderScanWorkerHandle,
  delegationScan: DelegationScanWorkerHandle,
  usageCounterScan: UsageCounterScanWorkerHandle,
  dataImport: DataImportWorkerHandle,
  documentReviewScan: DocumentReviewScanWorkerHandle,
  readAcknowledgementScan: ReadAcknowledgementScanWorkerHandle,
  licenseExpiryScan: LicenseExpiryScanWorkerHandle,
  obligationDueScan: ObligationDueScanWorkerHandle,
  hiradcExpiryScan: HiradcExpiryScanWorkerHandle,
  riskRegisterReviewScan: RiskRegisterReviewScanWorkerHandle,
  hiraReviewDueScan: HiraReviewDueScanWorkerHandle,
  workPermitExpiryScan: WorkPermitExpiryScanWorkerHandle,
  gasRetestDueScan: GasRetestDueScanWorkerHandle,
  incidentRegulatoryReportOverdueScan: IncidentRegulatoryReportOverdueScanWorkerHandle,
  incidentStatisticsRecalcScan: IncidentStatisticsRecalcScanWorkerHandle,
  inspectionRecordGenerationScan: InspectionRecordGenerationScanWorkerHandle,
  inspectionRecordOverdueScan: InspectionRecordOverdueScanWorkerHandle,
  inspectionFindingSlaScan: InspectionFindingSlaScanWorkerHandle,
  emergencyPlanReviewOverdueScan: EmergencyPlanReviewOverdueScanWorkerHandle,
  auditorCompetencyExpiryScan: AuditorCompetencyExpiryScanWorkerHandle,
  auditFindingClosureDueScan: AuditFindingClosureDueScanWorkerHandle,
  capaRootCauseSlaScan: CapaRootCauseSlaScanWorkerHandle,
  capaEffectivenessVerificationDueScan: CapaEffectivenessVerificationDueScanWorkerHandle,
  qualityComplaintResponseSlaScan: QualityComplaintResponseSlaScanWorkerHandle,
  wasteStorageDurationScan: WasteStorageDurationScanWorkerHandle,
  mcuReminderScan: McuReminderScanWorkerHandle,
  occupationalHealthReassessmentScan: OccupationalHealthReassessmentScanWorkerHandle,
  maintenanceDueScan: MaintenanceDueScanWorkerHandle,
  calibrationDueScan: CalibrationDueScanWorkerHandle,
  contractorDueScan: ContractorDueScanWorkerHandle,
): Promise<void> {
  await workflowSlaScan.worker.close();
  await workflowSlaScan.appContext.close();
  await notification.worker.close();
  await notification.deadLetterQueue.close();
  await notification.appContext.close();
  await attachmentScan.worker.close();
  await attachmentScan.appContext.close();
  await auditLogPartitionMaintenance.worker.close();
  await auditLogPartitionMaintenance.appContext.close();
  await reminderScan.worker.close();
  await reminderScan.appContext.close();
  await delegationScan.worker.close();
  await delegationScan.appContext.close();
  await usageCounterScan.worker.close();
  await usageCounterScan.appContext.close();
  await dataImport.worker.close();
  await dataImport.appContext.close();
  await documentReviewScan.worker.close();
  await documentReviewScan.appContext.close();
  await readAcknowledgementScan.worker.close();
  await readAcknowledgementScan.appContext.close();
  await licenseExpiryScan.worker.close();
  await licenseExpiryScan.appContext.close();
  await obligationDueScan.worker.close();
  await obligationDueScan.appContext.close();
  await hiradcExpiryScan.worker.close();
  await hiradcExpiryScan.appContext.close();
  await riskRegisterReviewScan.worker.close();
  await riskRegisterReviewScan.appContext.close();
  await hiraReviewDueScan.worker.close();
  await hiraReviewDueScan.appContext.close();
  await workPermitExpiryScan.worker.close();
  await workPermitExpiryScan.appContext.close();
  await gasRetestDueScan.worker.close();
  await gasRetestDueScan.appContext.close();
  await incidentRegulatoryReportOverdueScan.worker.close();
  await incidentRegulatoryReportOverdueScan.appContext.close();
  await incidentStatisticsRecalcScan.worker.close();
  await incidentStatisticsRecalcScan.appContext.close();
  await inspectionRecordGenerationScan.worker.close();
  await inspectionRecordGenerationScan.appContext.close();
  await inspectionRecordOverdueScan.worker.close();
  await inspectionRecordOverdueScan.appContext.close();
  await inspectionFindingSlaScan.worker.close();
  await inspectionFindingSlaScan.appContext.close();
  await emergencyPlanReviewOverdueScan.worker.close();
  await emergencyPlanReviewOverdueScan.appContext.close();
  await auditorCompetencyExpiryScan.worker.close();
  await auditorCompetencyExpiryScan.appContext.close();
  await auditFindingClosureDueScan.worker.close();
  await auditFindingClosureDueScan.appContext.close();
  await capaRootCauseSlaScan.worker.close();
  await capaRootCauseSlaScan.appContext.close();
  await capaEffectivenessVerificationDueScan.worker.close();
  await capaEffectivenessVerificationDueScan.appContext.close();
  await qualityComplaintResponseSlaScan.worker.close();
  await qualityComplaintResponseSlaScan.appContext.close();
  await wasteStorageDurationScan.worker.close();
  await wasteStorageDurationScan.appContext.close();
  await mcuReminderScan.worker.close();
  await mcuReminderScan.appContext.close();
  await occupationalHealthReassessmentScan.worker.close();
  await occupationalHealthReassessmentScan.appContext.close();
  await maintenanceDueScan.worker.close();
  await maintenanceDueScan.appContext.close();
  await calibrationDueScan.worker.close();
  await calibrationDueScan.appContext.close();
  await contractorDueScan.worker.close();
  await contractorDueScan.appContext.close();
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[qhse-worker] gagal bootstrap:", err);
  process.exit(1);
});
