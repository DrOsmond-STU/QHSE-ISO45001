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
exports.NotificationQueryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const notification_context_1 = require("./notification-context");
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
/**
 * Modul 25 §12 "Bell Icon In-App" / "dropdown daftar notifikasi" — sisi
 * READ yang task 0.11 SENGAJA tidak bangun (`NotificationService` 0.11
 * cuma py `enqueue()`, lihat banner comment `platform/notification/
 * notification.module.ts`). Query LANGSUNG ke tabel `notifications`
 * (dimiliki 0.11/platform, bukan modul ini) via `PrismaService` — bukan
 * impor service dari `platform/notification/*` krn TIDAK ADA method di
 * sana yang relevan (`enqueue()` murni write-side), pola query-langsung
 * yang sama dipakai berulang kali modul lain thd tabel platform (mis.
 * `PrismaScopeHierarchyResolver` 1.1).
 */
let NotificationQueryService = class NotificationQueryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listForCurrentUser(input = {}) {
        const userId = (0, notification_context_1.requireActorUserId)();
        const page = Math.max(1, input.page ?? 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, input.limit ?? DEFAULT_LIMIT));
        const where = { recipientUserId: userId, ...(input.unreadOnly ? { isRead: false } : {}) };
        return this.prisma.withRls(async (tx) => {
            const [data, total] = await Promise.all([
                tx.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
                tx.notification.count({ where }),
            ]);
            return { data, meta: { page, limit, total } };
        });
    }
    async unreadCount() {
        const userId = (0, notification_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.notification.count({ where: { recipientUserId: userId, isRead: false } }));
    }
    /**
     * RLS (tenant_id) TIDAK cukup di sini — user LAIN di tenant yang SAMA
     * bisa saja menebak notificationId user lain (bukan miliknya). Validasi
     * kepemilikan eksplisit WAJIB, sama pola AttachmentService.confirm()
     * (0.12, gap TDD §26 poin 14: "FK/RLS constraint semata TIDAK CUKUP").
     * NotFoundException SERAGAM (bukan ForbiddenException terpisah) utk
     * "tidak ada" DAN "milik user lain" — mencegah kebocoran info
     * keberadaan entitas lintas user, pola sama gap TDD §26 poin 31 (1.3).
     */
    async markAsRead(notificationId) {
        const userId = (0, notification_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const notification = await tx.notification.findUnique({ where: { id: notificationId } });
            if (!notification || notification.recipientUserId !== userId) {
                throw new common_1.NotFoundException("Notifikasi tidak ditemukan.");
            }
            if (notification.isRead) {
                return notification; // idempotent — sudah dibaca, no-op
            }
            return tx.notification.update({ where: { id: notificationId }, data: { isRead: true, readAt: new Date() } });
        });
    }
    async markAllAsRead() {
        const userId = (0, notification_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const result = await tx.notification.updateMany({
                where: { recipientUserId: userId, isRead: false },
                data: { isRead: true, readAt: new Date() },
            });
            return { count: result.count };
        });
    }
};
exports.NotificationQueryService = NotificationQueryService;
exports.NotificationQueryService = NotificationQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationQueryService);
//# sourceMappingURL=notification-query.service.js.map