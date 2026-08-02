import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * PRD §8 baris 1/2/3 (dokumen H-reminder_days_before, dokumen EXPIRED,
 * prakualifikasi H-60) — SATU scan pass gabungan, pola PERSIS
 * CalibrationDueScanService 6.2 (idempotency updateMany DI DALAM withRls,
 * enqueue() loop DI LUAR, hindari nested $transaction). Baris §8
 * "Evaluasi kinerja jadwal terlewat" SENGAJA tidak di sini (TIDAK ADA kolom
 * jadwal apa pun di contractor_performance_evaluations §5 literal utk
 * discan, lihat banner comment seed-contractor-notification-templates.ts).
 * Baris §8 "UNACCEPTABLE 2x berturut" JUGA tidak di sini — event-driven,
 * langsung di ContractorPerformanceEvaluationService.onReviewCompleted().
 */
export declare class ContractorDueScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
    private scanDocumentCompliance;
    private scanPrequalificationRenewal;
}
