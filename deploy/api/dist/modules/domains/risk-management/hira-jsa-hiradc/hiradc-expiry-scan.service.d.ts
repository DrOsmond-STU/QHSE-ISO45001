import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../../platform/observability/app-logger.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export declare class HiradcExpiryScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
