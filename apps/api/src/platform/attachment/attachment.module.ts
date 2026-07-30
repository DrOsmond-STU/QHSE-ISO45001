import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AttachmentController } from "./attachment.controller";
import { AttachmentQueueService } from "./attachment-queue.service";
import { AttachmentScanService } from "./attachment-scan.service";
import { AttachmentService } from "./attachment.service";
import { MALWARE_SCANNER } from "./malware-scanner.interface";
import { ObjectStorageService } from "./object-storage.service";
import { StubMalwareScanner } from "./stub-malware-scanner";

@Module({
  imports: [TenancyModule],
  controllers: [AttachmentController],
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
  ],
  exports: [AttachmentService, AttachmentScanService, ObjectStorageService],
})
export class AttachmentModule {}
