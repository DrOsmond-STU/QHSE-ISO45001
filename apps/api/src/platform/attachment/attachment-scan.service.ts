import { Inject, Injectable } from "@nestjs/common";
import sharp from "sharp";
import { PrismaService } from "../tenancy/prisma.service";
import { tenantContextStorage } from "../tenancy/tenant-context";
import { AttachmentScanJobPayload } from "./attachment-scan-job.types";
import { THUMBNAIL_MAX_DIMENSION_PX, THUMBNAIL_MIME_TYPES } from "./attachment.constants";
import { MALWARE_SCANNER, MalwareScanner } from "./malware-scanner.interface";
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
@Injectable()
export class AttachmentScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
    @Inject(MALWARE_SCANNER) private readonly scanner: MalwareScanner,
  ) {}

  async processScanJob(payload: AttachmentScanJobPayload): Promise<void> {
    await tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
      const buffer = await this.storage.getObjectBuffer(payload.storageKey);
      const scanResult = await this.scanner.scan(buffer);

      if (!scanResult.clean) {
        await this.prisma.withRls((tx) =>
          tx.attachment.update({ where: { id: payload.attachmentId }, data: { scanStatus: "INFECTED" } }),
        );
        return;
      }

      const thumbnailKey = await this.maybeGenerateThumbnail(buffer, payload);

      await this.prisma.withRls((tx) =>
        tx.attachment.update({
          where: { id: payload.attachmentId },
          data: { scanStatus: "CLEAN", thumbnailUrl: thumbnailKey },
        }),
      );
    });
  }

  private async maybeGenerateThumbnail(buffer: Buffer, payload: AttachmentScanJobPayload): Promise<string | undefined> {
    if (!THUMBNAIL_MIME_TYPES.includes(payload.mimeType)) {
      return undefined;
    }
    const thumbnailBuffer = await sharp(buffer)
      .resize(THUMBNAIL_MAX_DIMENSION_PX, THUMBNAIL_MAX_DIMENSION_PX, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    const thumbnailKey = this.storage.buildThumbnailKey(payload.storageKey);
    await this.storage.putObject(thumbnailKey, thumbnailBuffer, "image/jpeg");
    return thumbnailKey;
  }
}
