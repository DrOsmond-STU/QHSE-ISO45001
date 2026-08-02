import { OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
export declare class CapaEffectivenessVerificationDueScanQueueService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger;
    private readonly connection;
    private readonly queue;
    constructor();
    onApplicationBootstrap(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
