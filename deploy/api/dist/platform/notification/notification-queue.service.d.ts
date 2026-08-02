import { OnModuleDestroy } from "@nestjs/common";
import { NotificationDeliveryJobPayload } from "./notification-delivery-job.types";
export declare class NotificationQueueService implements OnModuleDestroy {
    private readonly connection;
    private readonly queue;
    constructor();
    /**
     * TASK_INSTRUCTION.md §0.11 — "retry exponential backoff max 5x". Job
     * TIDAK di-remove otomatis saat gagal (`removeOnFail: false`) — tetap
     * ada di failed-set BullMQ sebagai jejak tambahan di luar dead-letter
     * queue eksplisit (lihat worker.on('failed') di
     * apps/worker/src/notification.worker.ts) dan notification_logs status
     * FAILED, supaya "tidak hilang diam-diam" (acceptance criterion) benar
     * di tiga tempat sekaligus.
     */
    enqueueDelivery(payload: NotificationDeliveryJobPayload): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
