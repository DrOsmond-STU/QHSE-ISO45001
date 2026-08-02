import { HazardCategory, HazardRegister } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export interface CreateHazardRegisterInput {
    siteId?: string;
    hazardCode?: string;
    hazardCategory: HazardCategory;
    hazardDescription: string;
    potentialConsequence?: string;
}
export interface UpdateHazardRegisterInput {
    hazardCode?: string;
    hazardCategory?: HazardCategory;
    hazardDescription?: string;
    potentialConsequence?: string;
}
export declare class HazardRegisterService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateHazardRegisterInput): Promise<HazardRegister>;
    update(hazardId: string, input: UpdateHazardRegisterInput): Promise<HazardRegister>;
    getById(hazardId: string): Promise<HazardRegister>;
    /** siteId=undefined -> seluruh hazard tenant (generik + per-site); siteId
     * diisi -> generik (siteId NULL, PRD §5 "NULL = bahaya generik tenant-wide")
     * DITAMBAH yang spesifik site itu, pola sama DocumentService "NULL
     * berlaku lebih luas". */
    listActive(siteId?: string): Promise<HazardRegister[]>;
    /** Soft delete (deletedAt + status INACTIVE) — pola sama
     * IndustryTemplateService.deactivate() (1.2)/DocumentService.retire()
     * (2.1). BR-07 — cek referensial ke hira_hazard_lines/jsa_step_hazards/
     * hiradc_lines SEBELUM soft-delete, lihat banner comment kelas. */
    retire(hazardId: string): Promise<HazardRegister>;
}
