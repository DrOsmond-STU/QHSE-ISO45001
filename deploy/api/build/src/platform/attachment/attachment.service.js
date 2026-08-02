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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../tenancy/prisma.service");
const tenant_context_1 = require("../tenancy/tenant-context");
const attachment_queue_service_1 = require("./attachment-queue.service");
const attachment_constants_1 = require("./attachment.constants");
const object_storage_service_1 = require("./object-storage.service");
// TDD §5.1/§11 — tenant selalu ambient lewat tenantContextStorage, pola
// sama NumberingService (0.10)/NotificationService (0.11). BEDA dari
// keduanya: service ini PUNYA controller HTTP (POST /attachments/presign,
// POST /attachments/confirm) karena browser klien perlu memanggilnya
// langsung (upload presigned URL terjadi DI BROWSER, bukan in-process
// modul domain) — lihat TDD §11 alur upload.
function requireTenantId() {
    const tenantId = (0, tenant_context_1.getCurrentTenantId)();
    if (!tenantId) {
        throw new Error("Tenant context tidak ditemukan — request ditolak (fail closed).");
    }
    return tenantId;
}
let AttachmentService = class AttachmentService {
    prisma;
    storage;
    queueService;
    constructor(prisma, storage, queueService) {
        this.prisma = prisma;
        this.storage = storage;
        this.queueService = queueService;
    }
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
    async presign(request) {
        const tenantId = requireTenantId();
        const allowedMimeTypes = request.allowedMimeTypes ?? attachment_constants_1.DEFAULT_ALLOWED_MIME_TYPES;
        if (!allowedMimeTypes.includes(request.mimeType)) {
            throw new common_1.BadRequestException(`MIME type "${request.mimeType}" tidak diizinkan untuk konteks ini.`);
        }
        if (request.fileSize <= 0 || request.fileSize > attachment_constants_1.DEFAULT_MAX_FILE_SIZE_BYTES) {
            throw new common_1.BadRequestException(`Ukuran file harus antara 1 dan ${attachment_constants_1.DEFAULT_MAX_FILE_SIZE_BYTES} byte.`);
        }
        const attachmentId = (0, node_crypto_1.randomUUID)();
        const storageKey = this.storage.buildStorageKey(tenantId, attachmentId, request.fileName);
        const uploadUrl = await this.storage.presignPutUrl(storageKey, request.mimeType);
        return { attachmentId, uploadUrl, storageKey };
    }
    /**
     * TDD §11 — langkah 2. HEAD storage dulu (verifikasi keberadaan + baca
     * size/mime OTORITATIF) baru insert baris `attachments`
     * (scanStatus=PENDING_SCAN) + enqueue job attachment-scan. storageKey
     * WAJIB persis hasil rekonstruksi ulang buildStorageKey() dari
     * (tenantId, attachmentId, fileName) yang diklaim — mencegah client
     * confirm() dengan storageKey yang bukan miliknya.
     */
    async confirm(request, uploadedBy) {
        const tenantId = requireTenantId();
        const expectedKey = this.storage.buildStorageKey(tenantId, request.attachmentId, request.fileName);
        if (expectedKey !== request.storageKey) {
            throw new common_1.BadRequestException("storageKey tidak sesuai attachmentId/fileName yang diklaim.");
        }
        const head = await this.storage.headObject(request.storageKey);
        if (!head.exists) {
            throw new common_1.NotFoundException("File belum ter-upload ke storage — panggil presign() lalu upload lewat uploadUrl sebelum confirm().");
        }
        if (!head.sizeBytes || head.sizeBytes <= 0 || head.sizeBytes > attachment_constants_1.DEFAULT_MAX_FILE_SIZE_BYTES) {
            throw new common_1.BadRequestException(`Ukuran file hasil upload (${head.sizeBytes ?? 0} byte) di luar batas yang diizinkan.`);
        }
        const attachment = await this.prisma.withRls(async (tx) => {
            // PENTING: FK attachments.uploaded_by -> users TIDAK CUKUP untuk
            // mencegah cross-tenant reference — dibuktikan empiris (psql manual):
            // constraint FK di Postgres TIDAK tunduk RLS pada tabel yang
            // direferensikan (row users tenant lain tetap "ada" dari sudut
            // pandang FK check walau SELECT biasa terhadapnya mengembalikan 0
            // baris di bawah RLS). Validasi eksplisit ini yang jadi jaminan
            // sungguhan, bukan FK constraint semata — gap ini didokumentasikan
            // TDD §26 karena berpotensi relevan untuk modul lain yang FK ke
            // users/entity ber-RLS dari caller yang kurang trusted.
            const uploader = await tx.user.findUnique({ where: { id: uploadedBy } });
            if (!uploader) {
                throw new common_1.ForbiddenException("uploadedBy tidak valid untuk tenant ini.");
            }
            return tx.attachment.create({
                data: {
                    id: request.attachmentId,
                    tenantId,
                    entityType: request.entityType,
                    entityId: request.entityId,
                    fileName: request.fileName,
                    fileUrl: request.storageKey,
                    fileSize: head.sizeBytes,
                    mimeType: head.contentType ?? "application/octet-stream",
                    uploadedBy,
                    scanStatus: "PENDING_SCAN",
                },
            });
        });
        await this.queueService.enqueueScan({
            tenantId,
            attachmentId: attachment.id,
            storageKey: attachment.fileUrl,
            mimeType: attachment.mimeType,
        });
        return { attachmentId: attachment.id, scanStatus: attachment.scanStatus };
    }
    /**
     * Acceptance criterion task 0.12 — "file PENDING_SCAN/INFECTED tidak
     * dapat diunduh publik/dibagikan sampai CLEAN". Presigned GET URL
     * di-generate ON DEMAND (tidak pernah disimpan) SETELAH cek status ini —
     * itulah enforcement-nya, bukan skema/ACL storage (lihat banner comment
     * "Task 0.12" schema.prisma).
     */
    async getDownloadUrl(attachmentId) {
        const attachment = await this.prisma.withRls((tx) => tx.attachment.findUniqueOrThrow({ where: { id: attachmentId } }));
        if (attachment.scanStatus !== "CLEAN") {
            throw new common_1.ForbiddenException(`File belum bisa diunduh (status scan: ${attachment.scanStatus}).`);
        }
        const downloadUrl = await this.storage.presignGetUrl(attachment.fileUrl);
        return { downloadUrl };
    }
};
exports.AttachmentService = AttachmentService;
exports.AttachmentService = AttachmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        object_storage_service_1.ObjectStorageService,
        attachment_queue_service_1.AttachmentQueueService])
], AttachmentService);
