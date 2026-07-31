import { Module } from "@nestjs/common";
import { NotificationModule } from "../../../platform/notification/notification.module";
import { NumberingModule } from "../../../platform/numbering/numbering.module";
import { ObservabilityModule } from "../../../platform/observability/observability.module";
import { TenancyModule } from "../../../platform/tenancy/tenancy.module";
import { WorkflowEngineModule } from "../../../platform/workflow-engine/workflow-engine.module";
import { EnvironmentalAspectImpactController } from "./environmental-aspect-impact.controller";
import { EnvironmentalAspectImpactService } from "./environmental-aspect-impact.service";
import { EnvironmentalAspectReviewWorkflowCompletionListener } from "./environmental-aspect-review-workflow-completion.listener";
import { EnvironmentalMonitoringRecordService } from "./environmental-monitoring-record.service";
import { EnvironmentalPermitService } from "./environmental-permit.service";
import { EnvironmentalWorkflowBootstrapService } from "./environmental-workflow-bootstrap.service";
import { ProperAssessmentWorkflowCompletionListener } from "./proper-assessment-workflow-completion.listener";
import { ProperSelfAssessmentService } from "./proper-self-assessment.service";
import { WasteGenerationLogService } from "./waste-generation-log.service";
import { WasteManifestService } from "./waste-manifest.service";
import { WasteStorageDurationScanQueueService } from "./waste-storage-duration-scan-queue.service";
import { WasteStorageDurationScanService } from "./waste-storage-duration-scan.service";

// Task 5.2 (Modul 12 Environmental Management), modul DOMAIN KETUJUH
// BELAS, Phase 5 lanjut. DUA workflow_definitions process TERPISAH
// (ENV_ASPECT_REVIEW 2-stage, ENV_PROPER_ASSESSMENT 2-stage — lihat
// banner comment EnvironmentalWorkflowBootstrapService). TIDAK mengimpor
// CapaModule maupun RegulatoryComplianceModule — CAPA-linkage
// (aspects_impacts/monitoring.capa_id) MANUAL via linkCapaRegister()
// KECUALI monitoring EXCEED (BR-02, PRD literal "otomatis") yang
// diwujudkan EVENT STUB (ENV_MONITORING_CAPA_REQUIRED_EVENT) dikonsumsi
// EnvironmentalMonitoringCapaTriggerListener yg hidup DI capa/ (arah
// dependency SEARAH: CapaModule mengimpor modul ini, bukan sebaliknya,
// pola sama Audit->CAPA 4.1/4.2). environmental_permits.license_permit_id
// (BR-05) divalidasi via query Prisma langsung ke licenses_permits, TIDAK
// butuh impor RegulatoryComplianceModule (Prisma schema shared resource).
// SATU job cron baru (waste-storage-duration-scan 06:30 BR-03) — KEDUA
// *QueueService (producer) DAN *ScanService (consumer) didaftarkan di sini
// SEKALIGUS di EnvironmentalWorkerModule (apps/worker) — pola PERSIS
// CapaModule 4.2 (`CapaRootCauseSlaScanService` juga dobel-didaftarkan):
// scan SERVICE-nya SENGAJA dobel bukan keliru — proses worker sungguhan
// butuh instance sendiri via NestFactory.createApplicationContext()
// (EnvironmentalWorkerModule), TAPI test/*.integration-spec.ts juga butuh
// meng-inject scanService.scan() LANGSUNG dari createTestApp() (modul
// AppModule penuh, TIDAK PERNAH boot EnvironmentalWorkerModule terpisah)
// utk menguji job tanpa menunggu cron sungguhan — TIDAK ada cara lain
// meng-inject provider dari modul yang tidak pernah di-boot test harness.
@Module({
  imports: [TenancyModule, ObservabilityModule, WorkflowEngineModule, NumberingModule, NotificationModule],
  controllers: [EnvironmentalAspectImpactController],
  providers: [
    EnvironmentalWorkflowBootstrapService,
    EnvironmentalAspectImpactService,
    EnvironmentalAspectReviewWorkflowCompletionListener,
    EnvironmentalMonitoringRecordService,
    WasteGenerationLogService,
    WasteManifestService,
    WasteStorageDurationScanQueueService,
    WasteStorageDurationScanService,
    ProperSelfAssessmentService,
    ProperAssessmentWorkflowCompletionListener,
    EnvironmentalPermitService,
  ],
  exports: [
    EnvironmentalAspectImpactService,
    EnvironmentalMonitoringRecordService,
    WasteGenerationLogService,
    WasteManifestService,
    ProperSelfAssessmentService,
    EnvironmentalPermitService,
  ],
})
export class EnvironmentalModule {}
