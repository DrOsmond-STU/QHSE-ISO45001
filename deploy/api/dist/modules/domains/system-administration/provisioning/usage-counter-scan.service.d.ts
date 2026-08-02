import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../../../../platform/observability/app-logger.service";
import { UsageCounterService } from "./usage-counter.service";
export declare class UsageCounterScanService implements OnModuleDestroy {
    private readonly usageCounterService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(usageCounterService: UsageCounterService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    scan(): Promise<void>;
    private scanForTenant;
}
