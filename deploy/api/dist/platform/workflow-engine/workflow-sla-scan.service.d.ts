import { OnModuleDestroy } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../tenancy/prisma.service";
import { ApproverResolutionService } from "./approver-resolution.service";
export declare class WorkflowSlaScanService implements OnModuleDestroy {
    private readonly prisma;
    private readonly approverResolutionService;
    private readonly eventEmitter;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, approverResolutionService: ApproverResolutionService, eventEmitter: EventEmitter2);
    onModuleDestroy(): Promise<void>;
    scan(now?: Date): Promise<void>;
    private scanForTenant;
}
