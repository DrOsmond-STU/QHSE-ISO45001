import { OnModuleDestroy } from "@nestjs/common";
import { AppLoggerService } from "../observability/app-logger.service";
import { PrismaService } from "../tenancy/prisma.service";
import { NotificationDeliveryService } from "./notification-delivery.service";
export declare class NotificationPollService implements OnModuleDestroy {
    private readonly prisma;
    private readonly deliveryService;
    private readonly logger;
    private readonly adminPrisma;
    constructor(prisma: PrismaService, deliveryService: NotificationDeliveryService, logger: AppLoggerService);
    onModuleDestroy(): Promise<void>;
    tick(now?: Date): Promise<void>;
    private tickForTenant;
}
