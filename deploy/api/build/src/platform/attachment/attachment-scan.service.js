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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentScanService = void 0;
const common_1 = require("@nestjs/common");
const sharp_1 = __importDefault(require("sharp"));
const prisma_service_1 = require("../tenancy/prisma.service");
const tenant_context_1 = require("../tenancy/tenant-context");
const attachment_constants_1 = require("./attachment.constants");
const malware_scanner_interface_1 = require("./malware-scanner.interface");
const object_storage_service_1 = require("./object-storage.service");
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
let AttachmentScanService = class AttachmentScanService {
    prisma;
    storage;
    scanner;
    constructor(prisma, storage, scanner) {
        this.prisma = prisma;
        this.storage = storage;
        this.scanner = scanner;
    }
    async processScanJob(payload) {
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            const buffer = await this.storage.getObjectBuffer(payload.storageKey);
            const scanResult = await this.scanner.scan(buffer);
            if (!scanResult.clean) {
                await this.prisma.withRls((tx) => tx.attachment.update({ where: { id: payload.attachmentId }, data: { scanStatus: "INFECTED" } }));
                return;
            }
            const thumbnailKey = await this.maybeGenerateThumbnail(buffer, payload);
            await this.prisma.withRls((tx) => tx.attachment.update({
                where: { id: payload.attachmentId },
                data: { scanStatus: "CLEAN", thumbnailUrl: thumbnailKey },
            }));
        });
    }
    async maybeGenerateThumbnail(buffer, payload) {
        if (!attachment_constants_1.THUMBNAIL_MIME_TYPES.includes(payload.mimeType)) {
            return undefined;
        }
        const thumbnailBuffer = await (0, sharp_1.default)(buffer)
            .resize(attachment_constants_1.THUMBNAIL_MAX_DIMENSION_PX, attachment_constants_1.THUMBNAIL_MAX_DIMENSION_PX, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        const thumbnailKey = this.storage.buildThumbnailKey(payload.storageKey);
        await this.storage.putObject(thumbnailKey, thumbnailBuffer, "image/jpeg");
        return thumbnailKey;
    }
};
exports.AttachmentScanService = AttachmentScanService;
exports.AttachmentScanService = AttachmentScanService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(malware_scanner_interface_1.MALWARE_SCANNER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        object_storage_service_1.ObjectStorageService, Object])
], AttachmentScanService);
