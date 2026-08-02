import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../observability/app-logger.service";
import { PrismaService } from "../tenancy/prisma.service";
import { AttachmentScanService } from "./attachment-scan.service";
export declare class AttachmentPollService implements OnModuleDestroy {
    private readonly prisma;
    private readonly scanService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, scanService: AttachmentScanService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    tick(): Promise<void>;
    private tickForTenant;
}
