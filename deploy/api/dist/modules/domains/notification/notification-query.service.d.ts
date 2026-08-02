import { Notification } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface ListNotificationsInput {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
}
export interface ListNotificationsResult {
    data: Notification[];
    meta: {
        page: number;
        limit: number;
        total: number;
    };
}
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
export declare class NotificationQueryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listForCurrentUser(input?: ListNotificationsInput): Promise<ListNotificationsResult>;
    unreadCount(): Promise<number>;
    /**
     * RLS (tenant_id) TIDAK cukup di sini — user LAIN di tenant yang SAMA
     * bisa saja menebak notificationId user lain (bukan miliknya). Validasi
     * kepemilikan eksplisit WAJIB, sama pola AttachmentService.confirm()
     * (0.12, gap TDD §26 poin 14: "FK/RLS constraint semata TIDAK CUKUP").
     * NotFoundException SERAGAM (bukan ForbiddenException terpisah) utk
     * "tidak ada" DAN "milik user lain" — mencegah kebocoran info
     * keberadaan entitas lintas user, pola sama gap TDD §26 poin 31 (1.3).
     */
    markAsRead(notificationId: string): Promise<Notification>;
    markAllAsRead(): Promise<{
        count: number;
    }>;
}
