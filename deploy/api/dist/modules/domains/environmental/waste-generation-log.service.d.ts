import { EnvWasteType, EnvWasteUnitOfMeasure, WasteGenerationLog } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateWasteGenerationLogInput {
    siteId: string;
    departmentId?: string;
    logDate: Date;
    wasteCode?: string;
    wasteName: string;
    wasteType: EnvWasteType;
    quantityGenerated: number;
    unitOfMeasure: EnvWasteUnitOfMeasure;
    storageLocation?: string;
    storageStartDate?: Date;
    maxStorageDurationDays?: number;
    cumulativeStoredQuantity?: number;
}
/**
 * Task 5.2 (Modul 12 §4.3 poin 1, §3 "TPS LB3 Officer/Waste Handler | environmental.waste_generation_log.create").
 * BELUM ada controller HTTP.
 */
export declare class WasteGenerationLogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateWasteGenerationLogInput): Promise<WasteGenerationLog>;
    /** PRD §4.3 poin 2 — "waste_manifest_records mereferensikan akumulasi waste_generation_log terkait." */
    linkToManifest(wasteGenerationLogId: string, wasteManifestId: string): Promise<WasteGenerationLog>;
    /** Idempotency BR-03 (H-7 warning) — dipanggil waste-storage-duration-scan. */
    markStorageDurationWarningSent(wasteGenerationLogId: string): Promise<WasteGenerationLog>;
    getById(wasteGenerationLogId: string): Promise<WasteGenerationLog>;
    listBySite(siteId: string): Promise<WasteGenerationLog[]>;
}
