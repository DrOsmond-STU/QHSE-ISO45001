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
exports.DataImportPollService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../../../../platform/observability/app-logger.service");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../../platform/tenancy/tenant-context");
const data_import_processing_service_1 = require("./data-import-processing.service");
const POLL_BATCH_SIZE = 20;
// Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
// data-import.worker.ts (konsumen BullMQ `data-import`), dipicu
// CronRunnerController. processValidate()/processCommit() SUDAH
// idempoten-by-design lewat tryClaim() atomik (updateMany WHERE status=X,
// lihat banner comment data-import-processing.service.ts) — dibangun
// SEBELUM adaptasi ini krn apps/worker sungguhan sudah bisa overlap dgn
// panggilan langsung di test, jadi TIDAK perlu guard idempotency tambahan
// di sini, cukup panggil ulang utk job yang statusnya masih menunjukkan
// "belum selesai".
let DataImportPollService = class DataImportPollService {
    prisma;
    processingService;
    logger;
    adminPrisma;
    constructor(prisma, processingService, logger) {
        this.prisma = prisma;
        this.processingService = processingService;
        this.logger = logger;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async tick() {
        const rows = await this.adminPrisma.$queryRaw `
      SELECT DISTINCT tenant_id FROM data_import_jobs WHERE status IN ('UPLOADED', 'VALIDATED')
    `;
        for (const row of rows) {
            try {
                await this.tickForTenant(row.tenant_id);
            }
            catch (err) {
                this.logger.event("error", "data-import-poll gagal untuk satu tenant", {
                    module: "system-administration",
                    action: "data-import-poll.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async tickForTenant(tenantId) {
        const jobs = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.dataImportJob.findMany({ where: { tenantId, status: { in: ["UPLOADED", "VALIDATED"] } }, take: POLL_BATCH_SIZE })));
        let processed = 0;
        for (const job of jobs) {
            if (job.status === "UPLOADED") {
                await this.processingService.processValidate({ tenantId, dataImportJobId: job.id });
                processed += 1;
            }
            else if (job.status === "VALIDATED") {
                await this.processingService.processCommit({ tenantId, dataImportJobId: job.id });
                processed += 1;
            }
        }
        if (jobs.length > 0) {
            this.logger.event("info", "data-import-poll: job diproses", {
                module: "system-administration",
                action: "data-import-poll.tenant-processed",
                tenant_id: tenantId,
                processed_count: processed,
            });
        }
    }
};
exports.DataImportPollService = DataImportPollService;
exports.DataImportPollService = DataImportPollService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_import_processing_service_1.DataImportProcessingService,
        app_logger_service_1.AppLoggerService])
], DataImportPollService);
