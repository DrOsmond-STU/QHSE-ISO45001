import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * BR-03/PRD §8 "waste_generation_log mendekati max_storage_duration_days
 * (H-7) | TPS LB3 Officer, HSE Manager | In-app, Email". Struktur pola
 * PERSIS CapaRootCauseSlaScanService (4.2): idempotency updateMany DI
 * DALAM transaksi withRls, enqueue() loop DI LUAR (hindari nested
 * $transaction, lihat memory).
 */
export declare class WasteStorageDurationScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
