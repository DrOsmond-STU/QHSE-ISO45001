import { Module } from "@nestjs/common";
import { ObservabilityModule } from "../observability/observability.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AttachmentController } from "./attachment.controller";
import { LocalStorageController } from "./local-storage.controller";
import { AttachmentPollService } from "./attachment-poll.service";
import { AttachmentQueueService } from "./attachment-queue.service";
import { AttachmentScanService } from "./attachment-scan.service";
import { AttachmentService } from "./attachment.service";
import { MALWARE_SCANNER } from "./malware-scanner.interface";
import { ObjectStorageService } from "./object-storage.service";
import { StubMalwareScanner } from "./stub-malware-scanner";

@Module({
  imports: [TenancyModule, ObservabilityModule],
  controllers: [AttachmentController, LocalStorageController],
  providers: [
    ObjectStorageService,
    AttachmentQueueService,
    StubMalwareScanner,
    { provide: MALWARE_SCANNER, useExisting: StubMalwareScanner },
    AttachmentService,
    // Diekspor juga di sini (bukan cuma AttachmentWorkerModule) supaya test
    // integration apps/api bisa panggil processScanJob() langsung tanpa
    // boot proses worker terpisah — pola sama NotificationDeliveryService
    // di NotificationModule (task 0.11).
    AttachmentScanService,
    // Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
    // attachment-scan.worker.ts, dipicu CronRunnerController.
    AttachmentPollService,
  ],
  exports: [AttachmentService, AttachmentScanService, ObjectStorageService, AttachmentPollService],
})
export class AttachmentModule {}
