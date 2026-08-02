import { DataImportError, DataImportJob } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { DataImportQueueService } from "./data-import-queue.service";
import { DataImportRowMapperRegistry } from "./row-mappers/data-import-row-mapper-registry.service";
export interface CreateDataImportJobInput {
    targetModuleCode: string;
    attachmentId: string;
}
export interface CreateDataImportRetryJobInput {
    sourceDataImportJobId: string;
    attachmentId: string;
}
export declare class DataImportService {
    private readonly prisma;
    private readonly mapperRegistry;
    private readonly queueService;
    constructor(prisma: PrismaService, mapperRegistry: DataImportRowMapperRegistry, queueService: DataImportQueueService);
    /**
     * PRD §4.3 langkah 1-2. Prasyarat: caller SUDAH presign()+upload+confirm()
     * attachment (0.12) dgn entityType=DATA_IMPORT_JOB & entityId=<UUID yang
     * SAMA akan dipakai sbg id job ini> — lihat banner comment
     * schema.prisma "Task 1.6". TIDAK memeriksa scanStatus di sini (SENGAJA
     * async — lihat DataImportProcessingService.processValidate(), yang
     * retry via BullMQ backoff selama masih PENDING_SCAN).
     */
    createJob(input: CreateDataImportJobInput): Promise<DataImportJob>;
    /**
     * BR-03 (PRD Modul 31 §6) / Acceptance TASK_INSTRUCTION.md 1.6 —
     * "re-upload parsial baris gagal tertaut ke data_import_job_id asal".
     * targetModuleCode DIWARISKAN dari job sumber (bukan input caller) —
     * re-upload selalu utk modul target yang SAMA dgn job aslinya.
     */
    createRetryJob(input: CreateDataImportRetryJobInput): Promise<DataImportJob>;
    /**
     * PRD §4.3 langkah 3 — "Konfirmasi -> job async memproses import batch".
     * HANYA validasi (throw kalau job belum VALIDATED, fail fast) + enqueue —
     * TIDAK menuliskan transisi VALIDATED->IMPORTING sendiri (job masih
     * berstatus VALIDATED sesaat setelah method ini return). Transisi
     * SUNGGUHAN terjadi atomik di dalam DataImportProcessingService.processCommit()
     * (lihat banner comment di sana) — kalau confirmImport() SENDIRI yang
     * menuliskannya, dua panggilan confirmImport() bersamaan (mis. double-click
     * UI) SAMA-SAMA lolos cek status VALIDATED lalu SAMA-SAMA enqueue commit
     * job terpisah, memindahkan race-nya ke titik yang lebih awal alih-alih
     * menghilangkannya.
     */
    confirmImport(dataImportJobId: string): Promise<DataImportJob>;
    getJob(dataImportJobId: string): Promise<DataImportJob>;
    /** "preview error per baris" (PRD §12 Import Wizard step 3). */
    listErrorsForJob(dataImportJobId: string): Promise<DataImportError[]>;
    private assertModuleSupported;
    private resolveUnusedAttachment;
}
