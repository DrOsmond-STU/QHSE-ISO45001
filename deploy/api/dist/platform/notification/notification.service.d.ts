import { NotificationLanguage, NotificationPriority } from "@prisma/client";
import { PrismaService } from "../tenancy/prisma.service";
import { NotificationProvider } from "./notification-provider.interface";
import { NotificationQueueService } from "./notification-queue.service";
export interface NotificationEvent {
    /** mis. "WORK_PERMIT_EXPIRING_SOON" (Modul 25 §9 katalog event). */
    eventType: string;
    entityType: string;
    entityId: string;
    recipientUserId: string;
    priority: NotificationPriority;
    /** Kategori dipakai cross ke notification_preferences.event_category
     * (mis. "WORK_PERMIT") — sengaja TERPISAH dari eventType (Modul 25 §5:
     * "bukan per event_type detail agar UI preferensi sederhana"). */
    eventCategory: string;
    /** Variabel Handlebars, di-whitelist ketat terhadap template (lihat
     * notification-template.ts) — TERMASUK data user-generated (mis.
     * deskripsi insiden), di-HTML-escape otomatis saat render. */
    variables: Record<string, string>;
    language?: NotificationLanguage;
}
export interface EnqueueResult {
    notificationId: string;
}
export declare class NotificationService {
    private readonly prisma;
    private readonly queueService;
    private readonly provider;
    constructor(prisma: PrismaService, queueService: NotificationQueueService, provider: NotificationProvider);
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
    enqueue(event: NotificationEvent): Promise<EnqueueResult>;
    /**
     * Modul 25 §5 relasi — fallback 2 tingkat: template khusus tenant ->
     * template default sistem (tenantId NULL). Fallback tingkat-3 PRD
     * ("bahasa default tenant kalau bahasa user tidak tersedia") SENGAJA
     * tidak diimplementasikan — bergantung konsep "bahasa default per
     * tenant" yang belum ada kolomnya (Modul 01/task 1.1 belum ada), bukan
     * gap tersembunyi, cukup scope task 0.11 tidak sampai situ.
     */
    private resolveTemplate;
}
