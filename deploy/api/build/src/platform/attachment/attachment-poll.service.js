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
exports.AttachmentPollService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../observability/app-logger.service");
const prisma_service_1 = require("../tenancy/prisma.service");
const tenant_context_1 = require("../tenancy/tenant-context");
const attachment_scan_service_1 = require("./attachment-scan.service");
const POLL_BATCH_SIZE = 50;
// Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
// attachment-scan.worker.ts (konsumen BullMQ `attachment-scan`), dipicu
// CronRunnerController. AttachmentScanJobPayload (tenantId, attachmentId,
// storageKey, mimeType) SELURUHNYA rekonstruksi langsung dari baris
// `attachments` sendiri (fileUrl=storageKey) — TIDAK ada rendering/state
// tambahan spt notification (lihat notification-poll.service.ts), jadi
// TIDAK butuh kolom baru di schema.
let AttachmentPollService = class AttachmentPollService {
    prisma;
    scanService;
    logger;
    adminPrisma;
    constructor(prisma, scanService, logger) {
        this.prisma = prisma;
        this.scanService = scanService;
        this.logger = logger;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async tick() {
        const rows = await this.adminPrisma.$queryRaw `
      SELECT DISTINCT tenant_id FROM attachments WHERE scan_status = 'PENDING_SCAN'
    `;
        for (const row of rows) {
            try {
                await this.tickForTenant(row.tenant_id);
            }
            catch (err) {
                this.logger.event("error", "attachment-poll gagal untuk satu tenant", {
                    module: "attachment",
                    action: "attachment-poll.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async tickForTenant(tenantId) {
        const pending = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.attachment.findMany({ where: { tenantId, scanStatus: "PENDING_SCAN" }, take: POLL_BATCH_SIZE })));
        for (const attachment of pending) {
            await this.scanService.processScanJob({
                tenantId,
                attachmentId: attachment.id,
                storageKey: attachment.fileUrl,
                mimeType: attachment.mimeType,
            });
        }
        if (pending.length > 0) {
            this.logger.event("info", "attachment-poll: baris diproses", {
                module: "attachment",
                action: "attachment-poll.tenant-processed",
                tenant_id: tenantId,
                processed_count: pending.length,
            });
        }
    }
};
exports.AttachmentPollService = AttachmentPollService;
exports.AttachmentPollService = AttachmentPollService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        attachment_scan_service_1.AttachmentScanService,
        app_logger_service_1.AppLoggerService])
], AttachmentPollService);
