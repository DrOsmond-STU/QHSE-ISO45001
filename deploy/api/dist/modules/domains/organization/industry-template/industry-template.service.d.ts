import { IndustryTemplate, Prisma } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export interface CreateIndustryTemplateInput {
    code: string;
    name: string;
    description?: string;
    defaultRegulatoryCodes?: Prisma.InputJsonValue;
    defaultChecklistRefs?: Prisma.InputJsonValue;
    defaultModuleEntitlements?: Prisma.InputJsonValue;
    isSystemDefined?: boolean;
}
export interface UpdateIndustryTemplateInput {
    name?: string;
    description?: string;
    defaultRegulatoryCodes?: Prisma.InputJsonValue;
    defaultChecklistRefs?: Prisma.InputJsonValue;
    defaultModuleEntitlements?: Prisma.InputJsonValue;
}
export declare class IndustryTemplateService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listActive(): Promise<IndustryTemplate[]>;
    findByCode(code: string): Promise<IndustryTemplate | null>;
    /** Dipakai OrganizationService saat assign industry_template_id ke
     * tenant/company (PRD §4.1) — template harus ADA dan AKTIF; menugaskan
     * template tidak dikenal/nonaktif ditolak fail closed (bukan diam-diam
     * disimpan sebagai UUID yatim). */
    getActiveOrThrow(industryTemplateId: string): Promise<IndustryTemplate>;
    create(input: CreateIndustryTemplateInput): Promise<IndustryTemplate>;
    update(industryTemplateId: string, input: UpdateIndustryTemplateInput): Promise<IndustryTemplate>;
    /** BR-04 (PRD Modul 01 §6) — nonaktifkan (BUKAN hapus), supaya referensi
     * historis tenants/companies yang sudah memakainya tetap valid dan
     * regulatory_register yang sudah ada TIDAK retroaktif berubah (Modul 04
     * belum ada tabelnya Phase 1 — tidak ada yang perlu dilakukan di sini
     * selain isActive:false, lihat TDD §26). */
    deactivate(industryTemplateId: string): Promise<IndustryTemplate>;
}
