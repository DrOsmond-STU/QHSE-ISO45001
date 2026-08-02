import { PrismaService } from "../tenancy/prisma.service";
import { NotificationDeliveryJobPayload } from "./notification-delivery-job.types";
import { NotificationProvider } from "./notification-provider.interface";
export interface DeliveryAttemptContext {
    /** BullMQ `job.attemptsMade` SEBELUM percobaan ini berjalan (0 pada
     * percobaan pertama, 1 pada retry pertama, dst). */
    attemptsMade: number;
    maxAttempts: number;
}
/**
 * Sisi worker (dipanggil apps/worker/src/notification.worker.ts per job
 * `notification-queue`, proses TERPISAH dari apps/api — lihat
 * notification-delivery-job.types.ts). Single writer notification_logs:
 * SEMUA transisi status (SENT/FAILED/tetap QUEUED nunggu retry) ditulis DI
 * SINI, bukan juga di worker.on('failed') (yang cuma urus dead-letter
 * queue + alert placeholder) — menghindari race dua tempat menulis baris
 * yang sama.
 */
export declare class NotificationDeliveryService {
    private readonly prisma;
    private readonly provider;
    constructor(prisma: PrismaService, provider: NotificationProvider);
    /**
     * Sukses -> notification_logs SENT. Gagal -> attempt_count naik +
     * status FAILED HANYA kalau ini percobaan TERAKHIR (masih QUEUED kalau
     * BullMQ akan retry lagi), lalu RETHROW supaya BullMQ tetap menjadwalkan
     * retry/backoff-nya sendiri (exponential, TASK_INSTRUCTION §0.11) — throw
     * di sini BUKAN mekanisme dead-letter itu sendiri, cuma sinyal ke BullMQ.
     */
    processDeliveryJob(payload: NotificationDeliveryJobPayload, context: DeliveryAttemptContext): Promise<void>;
    private callProvider;
}
