import { PrismaService } from "../tenancy/prisma.service";
import { AttachmentScanJobPayload } from "./attachment-scan-job.types";
import { MalwareScanner } from "./malware-scanner.interface";
import { ObjectStorageService } from "./object-storage.service";
/**
 * Sisi worker (dipanggil apps/worker/src/attachment-scan.worker.ts per job
 * `attachment-scan`, proses TERPISAH dari apps/api — pola sama
 * NotificationDeliveryService task 0.11). Tenant context di-set eksplisit
 * dari job payload (worker proses terpisah, tidak ada HTTP request yang
 * mengisi AsyncLocalStorage).
 *
 * TIDAK ada dead-letter queue terpisah di sini (beda dari
 * NotificationDeliveryService 0.11) — acceptance criterion task 0.12
 * ("PENDING_SCAN/INFECTED tidak bisa diunduh sampai CLEAN") sudah
 * terpenuhi selama attachment TETAP di PENDING_SCAN kalau job gagal
 * berulang (masih correctly tidak bisa diunduh) — BullMQ retry bawaan
 * (attempts, lihat attachment.constants.ts) + structured console error di
 * worker.on('failed') (pola sama workflow-sla-scan.worker.ts 0.9) sudah
 * cukup, tidak perlu duplikasi infra dead-letter penuh 0.11 tanpa
 * acceptance criterion yang memintanya.
 */
export declare class AttachmentScanService {
    private readonly prisma;
    private readonly storage;
    private readonly scanner;
    constructor(prisma: PrismaService, storage: ObjectStorageService, scanner: MalwareScanner);
    processScanJob(payload: AttachmentScanJobPayload): Promise<void>;
    private maybeGenerateThumbnail;
}
