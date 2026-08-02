import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * TDD §13.1/§9 pola job cross-tenant (sama persis scan job modul lain).
 * BR-01 — "status ditandai terlambat (flag dashboard) ... memicu
 * notifikasi eskalasi ke HSE Manager." TIDAK ADA transisi status di sini —
 * EmergencyPlanStatus TIDAK punya nilai enum "OVERDUE_REVIEW" apa pun
 * (skema §5 literal), jadi "flag dashboard" murni ditinjau LIVE dari
 * next_review_due_date (bukan kolom status tersimpan) — scan job ini
 * SEPENUHNYA notifikasi, pola PERSIS InspectionFindingSlaScanService (3.6)
 * "daily nag": plan yang SAMA akan terus dinotifikasi ULANG SETIAP HARI
 * sampai direview ulang (nextReviewDueDate bergeser) atau di-supersede/
 * archive — TIDAK ADA kolom idempotency, gap TDD §26.
 */
export declare class EmergencyPlanReviewOverdueScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
