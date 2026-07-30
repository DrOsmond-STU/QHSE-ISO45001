import { Module } from "@nestjs/common";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AttachmentScanService } from "./attachment-scan.service";
import { MALWARE_SCANNER } from "./malware-scanner.interface";
import { ObjectStorageService } from "./object-storage.service";
import { StubMalwareScanner } from "./stub-malware-scanner";

// Modul SLIM khusus proses worker (apps/worker) — TIDAK ada HTTP/guard/JWT,
// cuma yang genuinely dibutuhkan AttachmentScanService. TIDAK termasuk
// AttachmentQueueService (producer, cuma dipakai sisi apps/api
// presign()/confirm()) — worker CUMA konsumen job. Pola sama persis
// notification-worker.module.ts (task 0.11) / workflow-engine-worker.module.ts
// (task 0.9).
@Module({
  imports: [TenancyModule],
  providers: [
    ObjectStorageService,
    StubMalwareScanner,
    { provide: MALWARE_SCANNER, useExisting: StubMalwareScanner },
    AttachmentScanService,
  ],
  // ObjectStorageService diekspor juga sejak task 1.6 — DataImportProcessingService
  // (system-administration, sisi worker) baca stream file Excel dari
  // storage yang SAMA, tidak boleh instansiasi client S3 terpisah (biaya
  // koneksi ganda tanpa manfaat, bucket-init onModuleInit() jadi dobel).
  exports: [AttachmentScanService, ObjectStorageService],
})
export class AttachmentWorkerModule {}
