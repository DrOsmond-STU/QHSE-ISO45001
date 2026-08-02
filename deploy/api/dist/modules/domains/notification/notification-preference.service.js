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
exports.NotificationPreferenceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const event_category_1 = require("./event-category");
const notification_context_1 = require("./notification-context");
const notification_time_1 = require("./notification-time");
const preference_matrix_1 = require("./preference-matrix");
/**
 * Modul 25 §12 "Halaman Preferensi Notifikasi" — Acceptance
 * TASK_INSTRUCTION.md 1.7: "preferensi user dihormati sebelum kirim
 * (bukan hanya default sistem)". Pembuktian bahwa preferensi ITU SENDIRI
 * dihormati sudah ada (0.11, `resolveAdditionalChannels()` +
 * `notification-channel-resolution.spec.ts`) — tugas modul ini murni
 * menyediakan CARA user mengubah baris `notification_preferences` yang
 * dibaca fungsi itu, lewat matriks (event_category x channel) yang bisa
 * di-upsert per cell.
 */
let NotificationPreferenceService = class NotificationPreferenceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMatrixForCurrentUser() {
        const userId = (0, notification_context_1.requireActorUserId)();
        const rows = await this.prisma.withRls((tx) => tx.notificationPreference.findMany({ where: { userId } }));
        return (0, preference_matrix_1.buildPreferenceMatrix)(rows.map((row) => ({
            eventCategory: row.eventCategory,
            channelCode: row.channelCode,
            isEnabled: row.isEnabled,
            deliveryMode: row.deliveryMode,
            quietHoursStart: (0, notification_time_1.dateToTimeString)(row.quietHoursStart),
            quietHoursEnd: (0, notification_time_1.dateToTimeString)(row.quietHoursEnd),
        })));
    }
    async upsertPreference(input) {
        const userId = (0, notification_context_1.requireActorUserId)();
        const tenantId = (0, notification_context_1.requireTenantId)();
        // BR-02 Modul 25 §6 — "channel IN_APP tidak dapat dinonaktifkan
        // user" — ditegakkan LAGI di sini (defense in depth, lihat banner
        // comment preference-matrix.ts) di titik masuk WRITE yang sungguhan.
        if (input.channelCode === "IN_APP") {
            throw new common_1.BadRequestException('BR-02: channel IN_APP tidak dapat diubah — selalu aktif, tidak bisa dimatikan.');
        }
        if (!(0, event_category_1.isKnownEventCategory)(input.eventCategory)) {
            throw new common_1.BadRequestException(`event_category "${input.eventCategory}" tidak dikenal.`);
        }
        if (input.quietHoursStart !== undefined && input.quietHoursStart !== null && !(0, notification_time_1.isValidTimeString)(input.quietHoursStart)) {
            throw new common_1.BadRequestException(`Format quietHoursStart tidak valid: "${input.quietHoursStart}" (harapkan "HH:mm").`);
        }
        if (input.quietHoursEnd !== undefined && input.quietHoursEnd !== null && !(0, notification_time_1.isValidTimeString)(input.quietHoursEnd)) {
            throw new common_1.BadRequestException(`Format quietHoursEnd tidak valid: "${input.quietHoursEnd}" (harapkan "HH:mm").`);
        }
        const quietHoursStart = (0, notification_time_1.timeStringToDate)(input.quietHoursStart);
        const quietHoursEnd = (0, notification_time_1.timeStringToDate)(input.quietHoursEnd);
        const row = await this.prisma.withRls((tx) => tx.notificationPreference.upsert({
            where: {
                userId_eventCategory_channelCode: {
                    userId,
                    eventCategory: input.eventCategory,
                    channelCode: input.channelCode,
                },
            },
            create: {
                tenantId,
                userId,
                eventCategory: input.eventCategory,
                channelCode: input.channelCode,
                isEnabled: input.isEnabled,
                deliveryMode: input.deliveryMode ?? "REAL_TIME",
                quietHoursStart,
                quietHoursEnd,
            },
            update: {
                isEnabled: input.isEnabled,
                ...(input.deliveryMode ? { deliveryMode: input.deliveryMode } : {}),
                quietHoursStart,
                quietHoursEnd,
            },
        }));
        return {
            eventCategory: row.eventCategory,
            categoryLabel: (0, event_category_1.getCategoryLabel)(row.eventCategory),
            channelCode: row.channelCode,
            isEnabled: row.isEnabled,
            editable: true,
            deliveryMode: row.deliveryMode,
            quietHoursStart: (0, notification_time_1.dateToTimeString)(row.quietHoursStart),
            quietHoursEnd: (0, notification_time_1.dateToTimeString)(row.quietHoursEnd),
        };
    }
};
exports.NotificationPreferenceService = NotificationPreferenceService;
exports.NotificationPreferenceService = NotificationPreferenceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationPreferenceService);
//# sourceMappingURL=notification-preference.service.js.map