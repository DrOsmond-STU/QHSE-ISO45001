import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * PRD §8 baris 1/2/5 (H-30/14/7/1 due-soon, OVERDUE, akreditasi provider
 * H-60) + BR-09 (transisi status OVERDUE) — SATU scan pass gabungan, pola
 * PERSIS MaintenanceDueScanService 6.1 (idempotency updateMany DI DALAM
 * withRls, enqueue() loop DI LUAR, hindari nested $transaction). Baris §8
 * "Sertifikat menunggu review" SENGAJA tidak di sini (Workflow Engine task
 * sudah cukup, lihat banner comment seed-calibration-notification-templates.ts).
 */
export declare class CalibrationDueScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
    private scanSchedules;
    private scanProviders;
}
