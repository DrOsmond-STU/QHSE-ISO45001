import { AttachmentScanStatus } from "@prisma/client";
import { PrismaService } from "../tenancy/prisma.service";
import { AttachmentQueueService } from "./attachment-queue.service";
import { ObjectStorageService } from "./object-storage.service";
export interface PresignAttachmentRequest {
    fileName: string;
    mimeType: string;
    fileSize: number;
    entityType: string;
    entityId: string;
    allowedMimeTypes?: string[];
}
export interface PresignAttachmentResult {
    attachmentId: string;
    uploadUrl: string;
    storageKey: string;
}
export interface ConfirmAttachmentRequest {
    attachmentId: string;
    storageKey: string;
    fileName: string;
    entityType: string;
    entityId: string;
}
export interface ConfirmAttachmentResult {
    attachmentId: string;
    scanStatus: AttachmentScanStatus;
}
export declare class AttachmentService {
    private readonly prisma;
    private readonly storage;
    private readonly queueService;
    constructor(prisma: PrismaService, storage: ObjectStorageService, queueService: AttachmentQueueService);
    /**
     * TDD §11 — langkah 1 alur upload. STATELESS (tidak nulis DB sama
     * sekali) — cuma hitung storage key + sign URL PUT. `attachmentId`
     * di-generate DI SINI (server), bukan client, supaya tidak bisa
     * ditebak/ditabrakkan; client wajib echo balik persis di confirm().
     * Validasi MIME/size di sini bersifat SOFT (fail fast, UX — mencegah
     * upload sia-sia) — validasi OTORITATIF ada di confirm() terhadap hasil
     * HEAD storage sungguhan, bukan klaim di request ini (TDD §11 eksplisit:
     * "bukan hanya client-side").
     */
    presign(request: PresignAttachmentRequest): Promise<PresignAttachmentResult>;
    /**
     * TDD §11 — langkah 2. HEAD storage dulu (verifikasi keberadaan + baca
     * size/mime OTORITATIF) baru insert baris `attachments`
     * (scanStatus=PENDING_SCAN) + enqueue job attachment-scan. storageKey
     * WAJIB persis hasil rekonstruksi ulang buildStorageKey() dari
     * (tenantId, attachmentId, fileName) yang diklaim — mencegah client
     * confirm() dengan storageKey yang bukan miliknya.
     */
    confirm(request: ConfirmAttachmentRequest, uploadedBy: string): Promise<ConfirmAttachmentResult>;
    /**
     * Acceptance criterion task 0.12 — "file PENDING_SCAN/INFECTED tidak
     * dapat diunduh publik/dibagikan sampai CLEAN". Presigned GET URL
     * di-generate ON DEMAND (tidak pernah disimpan) SETELAH cek status ini —
     * itulah enforcement-nya, bukan skema/ACL storage (lihat banner comment
     * "Task 0.12" schema.prisma).
     */
    getDownloadUrl(attachmentId: string): Promise<{
        downloadUrl: string;
    }>;
}
