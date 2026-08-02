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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDeliveryService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../tenancy/prisma.service");
const tenant_context_1 = require("../tenancy/tenant-context");
const notification_provider_interface_1 = require("./notification-provider.interface");
/**
 * Sisi worker (dipanggil apps/worker/src/notification.worker.ts per job
 * `notification-queue`, proses TERPISAH dari apps/api — lihat
 * notification-delivery-job.types.ts). Single writer notification_logs:
 * SEMUA transisi status (SENT/FAILED/tetap QUEUED nunggu retry) ditulis DI
 * SINI, bukan juga di worker.on('failed') (yang cuma urus dead-letter
 * queue + alert placeholder) — menghindari race dua tempat menulis baris
 * yang sama.
 */
let NotificationDeliveryService = class NotificationDeliveryService {
    prisma;
    provider;
    constructor(prisma, provider) {
        this.prisma = prisma;
        this.provider = provider;
    }
    /**
     * Sukses -> notification_logs SENT. Gagal -> attempt_count naik +
     * status FAILED HANYA kalau ini percobaan TERAKHIR (masih QUEUED kalau
     * BullMQ akan retry lagi), lalu RETHROW supaya BullMQ tetap menjadwalkan
     * retry/backoff-nya sendiri (exponential, TASK_INSTRUCTION §0.11) — throw
     * di sini BUKAN mekanisme dead-letter itu sendiri, cuma sinyal ke BullMQ.
     */
    async processDeliveryJob(payload, context) {
        const isFinalAttempt = context.attemptsMade + 1 >= context.maxAttempts;
        await tenant_context_1.tenantContextStorage.run({ tenantId: payload.tenantId }, async () => {
            try {
                const result = await this.callProvider(payload);
                await this.prisma.withRls((tx) => tx.notificationLog.update({
                    where: { id: payload.notificationLogId },
                    data: {
                        status: "SENT",
                        sentAt: new Date(),
                        attemptCount: { increment: 1 },
                        providerMessageId: result.providerMessageId,
                        providerResponse: result.raw ?? client_1.Prisma.JsonNull,
                    },
                }));
            }
            catch (err) {
                await this.prisma.withRls((tx) => tx.notificationLog.update({
                    where: { id: payload.notificationLogId },
                    data: {
                        status: isFinalAttempt ? "FAILED" : "QUEUED",
                        attemptCount: { increment: 1 },
                        providerResponse: { error: err instanceof Error ? err.message : String(err) },
                    },
                }));
                throw err;
            }
        });
    }
    async callProvider(payload) {
        if (payload.channelCode === "EMAIL") {
            return this.provider.sendEmail({ toEmail: payload.recipientAddress, subject: payload.subject ?? "", body: payload.body });
        }
        if (payload.channelCode === "WHATSAPP") {
            return this.provider.sendWhatsApp({ toAddress: payload.recipientAddress, body: payload.body });
        }
        return this.provider.sendTelegram({ toAddress: payload.recipientAddress, body: payload.body });
    }
};
exports.NotificationDeliveryService = NotificationDeliveryService;
exports.NotificationDeliveryService = NotificationDeliveryService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(notification_provider_interface_1.NOTIFICATION_PROVIDER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], NotificationDeliveryService);
//# sourceMappingURL=notification-delivery.service.js.map