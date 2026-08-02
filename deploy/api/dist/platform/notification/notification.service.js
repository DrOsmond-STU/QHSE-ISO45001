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
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../tenancy/prisma.service");
const tenant_context_1 = require("../tenancy/tenant-context");
const notification_channel_resolution_1 = require("./notification-channel-resolution");
const notification_provider_interface_1 = require("./notification-provider.interface");
const notification_template_1 = require("./notification-template");
const notification_constants_1 = require("./notification.constants");
const notification_queue_service_1 = require("./notification-queue.service");
// TDD §5.1/§9/§10 — tenant selalu ambient lewat tenantContextStorage,
// TIDAK ada parameter tenantId eksplisit (pola sama WorkflowEngineService
// 0.9 & NumberingService 0.10) — enqueue() ini yang dipanggil IN-PROCESS
// oleh modul domain (Phase 1+, request HTTP sungguhan sudah mengisi
// context). Job BullMQ yang di-push ke worker (proses TERPISAH) beda
// cerita — payload-nya bawa tenantId eksplisit, lihat
// notification-delivery-job.types.ts.
function requireTenantId() {
    const tenantId = (0, tenant_context_1.getCurrentTenantId)();
    if (!tenantId) {
        throw new Error("Tenant context tidak ditemukan — request ditolak (fail closed).");
    }
    return tenantId;
}
function requireSubjectTemplate(template) {
    if (!template.subjectTemplate) {
        throw new Error(`notification_templates (id=${template.id}, channel=IN_APP) tidak punya subject_template — wajib diisi untuk merender notifications.title.`);
    }
    return template.subjectTemplate;
}
function toQuietHoursWindow(start, end) {
    if (!start || !end)
        return null;
    return {
        startMinutes: start.getUTCHours() * 60 + start.getUTCMinutes(),
        endMinutes: end.getUTCHours() * 60 + end.getUTCMinutes(),
    };
}
let NotificationService = class NotificationService {
    prisma;
    queueService;
    provider;
    constructor(prisma, queueService, provider) {
        this.prisma = prisma;
        this.queueService = queueService;
        this.provider = provider;
    }
    /**
     * Master PRD Modul 25 §4.1 — alur pengiriman notifikasi generik. IN_APP
     * (BR-02, tidak bisa dimatikan) dibuat SINKRON di dalam method ini
     * (bukan lewat BullMQ — tidak ada "provider" eksternal yang bisa gagal
     * untuk in-app, cuma insert row). Kanal tambahan (EMAIL/WHATSAPP/
     * TELEGRAM) diresolusi (BR-01/03 + quiet hours,
     * notification-channel-resolution.ts) dan di-enqueue ke `notification-queue`
     * SETELAH transaksi DB commit — fire-and-forget (NFR §11 Modul 25),
     * modul sumber tidak pernah menunggu pengiriman aktual selesai.
     *
     * Kenapa push job DI LUAR transaksi: kalau di-push DI DALAM lalu
     * transaksi rollback (mis. gagal constraint di tengah), job sudah
     * kepalang di antrian padahal baris DB-nya batal — worker akan memproses
     * job yang notification_logs-nya tidak pernah ada. Push di luar
     * memastikan urutan: baris DB PASTI commit dulu, baru job masuk antrian.
     */
    async enqueue(event) {
        const tenantId = requireTenantId();
        const language = event.language ?? notification_constants_1.DEFAULT_NOTIFICATION_LANGUAGE;
        const now = new Date();
        const { notificationId, deliveryJobs } = await this.prisma.withRls(async (tx) => {
            const recipient = await tx.user.findUniqueOrThrow({ where: { id: event.recipientUserId } });
            const inAppTemplate = await this.resolveTemplate(tx, tenantId, event.eventType, "IN_APP", language);
            const title = (0, notification_template_1.renderTemplate)(requireSubjectTemplate(inAppTemplate), event.variables);
            const body = (0, notification_template_1.renderTemplate)(inAppTemplate.bodyTemplate, event.variables);
            const notification = await tx.notification.create({
                data: {
                    tenantId,
                    recipientUserId: event.recipientUserId,
                    eventType: event.eventType,
                    entityType: event.entityType,
                    entityId: event.entityId,
                    title,
                    body,
                    priority: event.priority,
                },
            });
            // sendInApp() trivial (tidak pernah gagal realistis) — dipanggil
            // langsung, bukan lewat queue/retry (lihat stub-notification.provider.ts).
            await this.provider.sendInApp({ notificationId: notification.id });
            await tx.notificationLog.create({
                data: { tenantId, notificationId: notification.id, channelCode: "IN_APP", status: "SENT", attemptCount: 1, sentAt: now },
            });
            const tenantChannels = await tx.notificationChannel.findMany({ where: { tenantId } });
            const userPreferences = await tx.notificationPreference.findMany({
                where: { tenantId, userId: event.recipientUserId, eventCategory: event.eventCategory },
            });
            const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
            const additionalChannels = (0, notification_channel_resolution_1.resolveAdditionalChannels)(event.priority, tenantChannels.map((c) => ({ channelCode: c.channelCode, isEnabled: c.isEnabled })), userPreferences.map((p) => ({
                channelCode: p.channelCode,
                isEnabled: p.isEnabled,
                quietHours: toQuietHoursWindow(p.quietHoursStart, p.quietHoursEnd),
            })), nowMinutes);
            const jobs = [];
            for (const channelCode of additionalChannels) {
                const template = await this.resolveTemplate(tx, tenantId, event.eventType, channelCode, language);
                const renderedBody = (0, notification_template_1.renderTemplate)(template.bodyTemplate, event.variables);
                const renderedSubject = template.subjectTemplate ? (0, notification_template_1.renderTemplate)(template.subjectTemplate, event.variables) : undefined;
                const recipientAddress = channelCode === "EMAIL" ? recipient.email : "";
                const log = await tx.notificationLog.create({
                    data: {
                        tenantId,
                        notificationId: notification.id,
                        channelCode,
                        status: "QUEUED",
                        // Selalu disimpan (bukan cuma saat REDIS_ENABLED=false) — lihat
                        // banner comment NotificationLog schema.prisma: dipakai
                        // NotificationPollService (mode cron) DAN jadi audit trail
                        // tambahan yang tidak bergantung intip Redis (mode BullMQ).
                        recipientAddress,
                        subject: renderedSubject,
                        body: renderedBody,
                    },
                });
                jobs.push({
                    tenantId,
                    notificationLogId: log.id,
                    channelCode,
                    // Cuma EMAIL yang punya sumber data kontak sungguhan di Phase 0
                    // (users.email, task 0.6) — WA/Telegram belum ada kolom kontak
                    // (menyusul task 1.3 Modul 02); stub provider throw utk kedua
                    // channel itu terlepas dari isi field ini (lihat
                    // notification-delivery-job.types.ts).
                    recipientAddress: channelCode === "EMAIL" ? recipient.email : "",
                    subject: renderedSubject,
                    body: renderedBody,
                });
            }
            return { notificationId: notification.id, deliveryJobs: jobs };
        });
        for (const job of deliveryJobs) {
            await this.queueService.enqueueDelivery(job);
        }
        return { notificationId };
    }
    /**
     * Modul 25 §5 relasi — fallback 2 tingkat: template khusus tenant ->
     * template default sistem (tenantId NULL). Fallback tingkat-3 PRD
     * ("bahasa default tenant kalau bahasa user tidak tersedia") SENGAJA
     * tidak diimplementasikan — bergantung konsep "bahasa default per
     * tenant" yang belum ada kolomnya (Modul 01/task 1.1 belum ada), bukan
     * gap tersembunyi, cukup scope task 0.11 tidak sampai situ.
     */
    async resolveTemplate(tx, tenantId, eventType, channelCode, language) {
        const tenantSpecific = await tx.notificationTemplate.findFirst({
            where: { tenantId, eventType, channelCode, language, isActive: true },
        });
        if (tenantSpecific)
            return tenantSpecific;
        const systemDefault = await tx.notificationTemplate.findFirst({
            where: { tenantId: null, eventType, channelCode, language, isActive: true },
        });
        if (systemDefault)
            return systemDefault;
        throw new common_1.NotFoundException(`notification_templates tidak ditemukan untuk event_type=${eventType} channel=${channelCode} language=${language} (baik tenant maupun default sistem).`);
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(notification_provider_interface_1.NOTIFICATION_PROVIDER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_queue_service_1.NotificationQueueService, Object])
], NotificationService);
//# sourceMappingURL=notification.service.js.map