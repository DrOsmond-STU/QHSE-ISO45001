import { EnvWastePackagingType, EnvWasteType, EnvWasteUnitOfMeasure, WasteManifestRecord } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { EnvironmentalWorkflowBootstrapService } from "./environmental-workflow-bootstrap.service";
import { WasteGenerationLogService } from "./waste-generation-log.service";
export interface CreateWasteManifestInput {
    siteId: string;
    wasteType: EnvWasteType;
    wasteCode?: string;
    wasteName: string;
    wasteDescription?: string;
    wasteSourceProcess?: string;
    quantity: number;
    unitOfMeasure: EnvWasteUnitOfMeasure;
    packagingType: EnvWastePackagingType;
    generationDate: Date;
    storageLocation?: string;
    tpsLb3PermitId?: string;
    linkedGenerationLogIds?: string[];
}
/**
 * Task 5.2 (Modul 12 §4.3, §3 "Environmental Officer | environmental.waste_manifest.manage",
 * "TPS LB3 Officer | environmental.waste_manifest.create"). BELUM ada
 * controller HTTP.
 */
export declare class WasteManifestService {
    private readonly prisma;
    private readonly numberingService;
    private readonly bootstrapService;
    private readonly wasteGenerationLogService;
    constructor(prisma: PrismaService, numberingService: NumberingService, bootstrapService: EnvironmentalWorkflowBootstrapService, wasteGenerationLogService: WasteGenerationLogService);
    create(input: CreateWasteManifestInput): Promise<WasteManifestRecord>;
    issue(manifestId: string): Promise<WasteManifestRecord>;
    markInTransit(manifestId: string, detail: {
        transporterName: string;
        transporterLicenseNo: string;
        transporterVehicleNo: string;
        transportDate: Date;
    }): Promise<WasteManifestRecord>;
    markReceivedByTransporter(manifestId: string): Promise<WasteManifestRecord>;
    markReceivedByProcessor(manifestId: string, detail: {
        destinationFacilityName: string;
        destinationFacilityLicenseNo: string;
        receivingConfirmationDate: Date;
    }): Promise<WasteManifestRecord>;
    complete(manifestId: string): Promise<WasteManifestRecord>;
    reject(manifestId: string): Promise<WasteManifestRecord>;
    /** BR-04 — festronik_manifest_no identitas TERPISAH, bukan hasil numbering_configs. */
    recordFestronikNumber(manifestId: string, festronikManifestNo: string): Promise<WasteManifestRecord>;
    private transition;
    getById(manifestId: string): Promise<WasteManifestRecord>;
    listBySite(siteId: string): Promise<WasteManifestRecord[]>;
}
