import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../platform/observability/app-logger.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export declare class IncidentRegulatoryReportOverdueScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, notificationService: NotificationService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
