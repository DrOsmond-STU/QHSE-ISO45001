import { InspectionChecklistTemplate, InspectionChecklistTemplateItem, InspectionResponseType, InspectionScoringMethod, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateInspectionChecklistTemplateItemInput {
    sequenceNo: number;
    itemText: string;
    category?: string;
    responseType: InspectionResponseType;
    weight?: number;
    isMandatory?: boolean;
    requiresPhotoIfFail?: boolean;
}
export interface CreateInspectionChecklistTemplateInput {
    inspectionTypeId: string;
    name: string;
    scoringMethod: InspectionScoringMethod;
    passingScoreThreshold?: number;
    effectiveDate: Date;
    items: CreateInspectionChecklistTemplateItemInput[];
}
export declare class InspectionChecklistTemplateService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateInspectionChecklistTemplateInput): Promise<InspectionChecklistTemplate>;
    /**
     * BR-07 — "perubahan versi TIDAK mengubah record historis... record
     * menyimpan referensi versi snapshot." Versi BARU = BARIS BARU
     * (version = versi aktif TERAKHIR + 1), baris LAMA TIDAK PERNAH diupdate
     * SELAIN isActive->false — pola PERSIS RiskMatrixConfigService (3.1,
     * versioned CRUD). inspection_records yang SUDAH memakai versi lama
     * TETAP menunjuk baris LAMA via FK snapshot (inspectionChecklistTemplateId),
     * genuinely tidak tersentuh operasi ini.
     */
    createNewVersion(inspectionTypeId: string, input: Omit<CreateInspectionChecklistTemplateInput, "inspectionTypeId">): Promise<InspectionChecklistTemplate>;
    private createItems;
    resolveActiveTemplate(inspectionTypeId: string): Promise<InspectionChecklistTemplate>;
    getById(templateId: string): Promise<{
        items: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            sequenceNo: number;
            category: string | null;
            inspectionChecklistTemplateId: string;
            itemText: string;
            responseType: import("@prisma/client").$Enums.InspectionResponseType;
            weight: Prisma.Decimal;
            isMandatory: boolean;
            requiresPhotoIfFail: boolean;
        }[];
    } & {
        version: number;
        isActive: boolean;
        name: string;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        deletedAt: Date | null;
        effectiveDate: Date;
        inspectionTypeId: string;
        scoringMethod: import("@prisma/client").$Enums.InspectionScoringMethod;
        passingScoreThreshold: Prisma.Decimal | null;
    }>;
    listItemsByTemplate(templateId: string): Promise<InspectionChecklistTemplateItem[]>;
}
