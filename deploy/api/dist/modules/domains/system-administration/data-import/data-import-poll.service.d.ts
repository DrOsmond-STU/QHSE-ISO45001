import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../../platform/observability/app-logger.service";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { DataImportProcessingService } from "./data-import-processing.service";
export declare class DataImportPollService implements OnModuleDestroy {
    private readonly prisma;
    private readonly processingService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, processingService: DataImportProcessingService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    tick(): Promise<void>;
    private tickForTenant;
}
