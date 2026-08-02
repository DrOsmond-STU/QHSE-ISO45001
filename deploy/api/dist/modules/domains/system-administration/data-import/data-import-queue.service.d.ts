import { OnModuleDestroy } from "@nestjs/common";
import { DataImportJobPayload } from "./data-import-job.types";
export declare class DataImportQueueService implements OnModuleDestroy {
    private readonly connection;
    private readonly queue;
    constructor();
    /**
     * attempts tinggi + backoff exponential — dipakai jadi mekanisme
     * tunggu-hasil-scan-malware (lihat data-import.constants.ts banner
     * comment), BUKAN cuma toleransi error transient biasa.
     */
    enqueueValidate(payload: DataImportJobPayload): Promise<void>;
    enqueueCommit(payload: DataImportJobPayload): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
