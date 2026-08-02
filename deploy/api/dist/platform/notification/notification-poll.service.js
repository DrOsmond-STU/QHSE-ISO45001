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
exports.NotificationPollService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_logger_service_1 = require("../observability/app-logger.service");
const prisma_service_1 = require("../tenancy/prisma.service");
const tenant_context_1 = require("../tenancy/tenant-context");
const notification_delivery_service_1 = require("./notification-delivery.service");
const notification_constants_1 = require("./notification.constants");
const POLL_BATCH_SIZE = 100;
// Shared-hosting adaptation (REDIS_ENABLED=false) — pengganti
// notification.worker.ts (konsumen BullMQ `notification-queue`), dipanggil
// CronRunnerController lewat cron tick yang sama dgn 31 scan job (pola
// PERSIS *-due-scan.service.ts: admin Prisma cross-tenant SELECT DISTINCT
// tenant_id, lalu per-tenant withRls()). subject/body/recipientAddress
// SUDAH dipersist NotificationService.enqueue() (lihat banner comment
// NotificationLog schema.prisma) — TIDAK perlu render ulang di sini.
let NotificationPollService = class NotificationPollService {
    prisma;
    deliveryService;
    logger;
    adminPrisma;
    constructor(prisma, deliveryService, logger) {
        this.prisma = prisma;
        this.deliveryService = deliveryService;
        this.logger = logger;
        this.adminPrisma = new client_1.PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    }
    async onModuleDestroy() {
        await this.adminPrisma.$disconnect();
    }
    async tick(now = new Date()) {
        const rows = await this.adminPrisma.$queryRaw `
      SELECT DISTINCT tenant_id FROM notification_logs
      WHERE status = 'QUEUED'
        AND channel_code IN ('EMAIL', 'WHATSAPP', 'TELEGRAM')
        AND (next_attempt_at IS NULL OR next_attempt_at <= ${now})
    `;
        for (const row of rows) {
            try {
                await this.tickForTenant(row.tenant_id, now);
            }
            catch (err) {
                this.logger.event("error", "notification-poll gagal untuk satu tenant", {
                    module: "notification",
                    action: "notification-poll.tenant-failed",
                    tenant_id: row.tenant_id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    async tickForTenant(tenantId, now) {
        const dueLogs = await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.notificationLog.findMany({
            where: {
                tenantId,
                status: "QUEUED",
                channelCode: { in: ["EMAIL", "WHATSAPP", "TELEGRAM"] },
                OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
            },
            take: POLL_BATCH_SIZE,
        })));
        let processed = 0;
        for (const log of dueLogs) {
            if (log.channelCode !== "EMAIL" && log.channelCode !== "WHATSAPP" && log.channelCode !== "TELEGRAM")
                continue;
            const payload = {
                tenantId,
                notificationLogId: log.id,
                channelCode: log.channelCode,
                recipientAddress: log.recipientAddress ?? "",
                subject: log.subject ?? undefined,
                body: log.body ?? "",
            };
            try {
                await this.deliveryService.processDeliveryJob(payload, { attemptsMade: log.attemptCount, maxAttempts: notification_constants_1.NOTIFICATION_MAX_ATTEMPTS });
                processed += 1;
            }
            catch {
                // processDeliveryJob() SUDAH menulis status QUEUED (masih ada sisa
                // percobaan)/FAILED (percobaan terakhir) + attempt_count ke DB (lihat
                // notification-delivery.service.ts) — di sini CUMA menjadwalkan
                // next_attempt_at supaya tick berikutnya tidak langsung retry baris
                // yang barusan gagal (pengganti exponential backoff BullMQ; skala
                // menit bukan detik krn cadence tick ditentukan cron, bukan job
                // queue instan — lihat panduan deployment rekomendasi interval).
                const backoffMinutes = 2 ** log.attemptCount;
                await tenant_context_1.tenantContextStorage.run({ tenantId }, () => this.prisma.withRls((tx) => tx.notificationLog.updateMany({
                    where: { id: log.id, status: "QUEUED" },
                    data: { nextAttemptAt: new Date(now.getTime() + backoffMinutes * 60_000) },
                })));
            }
        }
        if (dueLogs.length > 0) {
            this.logger.event("info", "notification-poll: baris diproses", {
                module: "notification",
                action: "notification-poll.tenant-processed",
                tenant_id: tenantId,
                due_count: dueLogs.length,
                processed_count: processed,
            });
        }
    }
};
exports.NotificationPollService = NotificationPollService;
exports.NotificationPollService = NotificationPollService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_delivery_service_1.NotificationDeliveryService,
        app_logger_service_1.AppLoggerService])
], NotificationPollService);
//# sourceMappingURL=notification-poll.service.js.map