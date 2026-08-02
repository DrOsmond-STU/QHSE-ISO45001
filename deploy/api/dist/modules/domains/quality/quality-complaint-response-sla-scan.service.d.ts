import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * BR-02 §8 "SLA respons awal komplain terlewati | Quality Manager,
 * Customer Service Head". TIDAK ADA role baseline "Customer Service Head"
 * terpisah (lihat gap RBAC seed soal Customer Service/Sales dilipat ke
 * WORKER_EMPLOYEE) — disubstitusi `received_by` (orang yang genuinely
 * mencatat komplain ini) + QUALITY_MANAGER tenant-wide, pola sama seluruh
 * scan job lain yang mensubstitusi role PRD tanpa padanan baseline.
 */
export declare class QualityComplaintResponseSlaScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
