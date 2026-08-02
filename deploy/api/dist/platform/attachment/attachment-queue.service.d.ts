import { OnModuleDestroy } from "@nestjs/common";
import { AttachmentScanJobPayload } from "./attachment-scan-job.types";
export declare class AttachmentQueueService implements OnModuleDestroy {
    private readonly connection;
    private readonly queue;
    constructor();
    enqueueScan(payload: AttachmentScanJobPayload): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
