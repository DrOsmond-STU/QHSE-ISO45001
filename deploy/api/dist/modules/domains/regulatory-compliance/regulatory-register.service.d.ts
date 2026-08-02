import { ComplianceApplicableScope, Prisma, RegulatoryRegister, RegulatoryRegisterStatus, RegulationType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { IndustryTemplateService } from "../organization/industry-template/industry-template.service";
export interface CreateRegulatoryRegisterInput {
    frameworkId?: string;
    regulationType: RegulationType;
    regulationNumber: string;
    title: string;
    issuingAuthority?: string;
    issueDate?: Date;
    effectiveDate?: Date;
    applicableScope?: ComplianceApplicableScope;
    applicableCompanyId?: string;
    applicableSiteId?: string;
    industryRelevance?: Prisma.InputJsonValue;
    summary?: string;
    sourceUrl?: string;
    reviewCycleMonths?: number;
}
export type UpdateRegulatoryRegisterInput = Partial<Pick<CreateRegulatoryRegisterInput, "title" | "issuingAuthority" | "issueDate" | "effectiveDate" | "applicableScope" | "applicableCompanyId" | "applicableSiteId" | "industryRelevance" | "summary" | "sourceUrl" | "reviewCycleMonths">>;
export interface SeedFromIndustryTemplateResult {
    created: RegulatoryRegister[];
    skippedCodes: string[];
}
export declare class RegulatoryRegisterService {
    private readonly prisma;
    private readonly industryTemplateService;
    constructor(prisma: PrismaService, industryTemplateService: IndustryTemplateService);
    create(input: CreateRegulatoryRegisterInput): Promise<RegulatoryRegister>;
    update(registerId: string, input: UpdateRegulatoryRegisterInput): Promise<RegulatoryRegister>;
    getById(registerId: string): Promise<RegulatoryRegister>;
    listActive(): Promise<RegulatoryRegister[]>;
    /**
     * PRD §4.1 poin 3 (implisit) — register lama diganti register baru
     * (perubahan regulasi/revisi). status -> SUPERSEDED/REVOKED (BUKAN
     * delete, BR-04 tetap membiarkan obligation historis yang sudah menunjuk
     * ke baris ini apa adanya — lihat regulatory-register-rules.ts). Kalau
     * ada penerus, supersededByRegisterId diisi (unique — satu register lama
     * hanya bisa digantikan SATU register baru, ditegakkan constraint DB).
     */
    retire(registerId: string, status: Extract<RegulatoryRegisterStatus, "SUPERSEDED" | "REVOKED">, supersededByRegisterId?: string): Promise<RegulatoryRegister>;
    /**
     * PRD §4.1 poin 1 — "Saat onboarding tenant, industry_templates.default_regulatory_codes
     * di-seed menjadi entri awal regulatory_register (status ACTIVE)." Method
     * BERDIRI SENDIRI (buka withRls()-nya sendiri, pola sama
     * DmsBootstrapService.ensureNumberingConfig() 2.1) — SENGAJA TIDAK
     * dipanggil otomatis dari ProvisioningService.provisionTenant() (1.5)
     * dalam task ini (di luar timebox menyentuh ulang orkestrasi Phase 1
     * yang sudah shipped; gap TDD §26). Kode yang tidak match baris apapun
     * di regulatory_frameworks (semestinya nihil hari ini — seed-regulatory-frameworks.ts
     * sudah mencakup SELURUH kode yang dirujuk seed-industry-templates.ts,
     * lihat banner comment file itu) dilaporkan via skippedCodes, bukan
     * exception — supaya template baru di masa depan yang lupa menambah
     * baris framework tidak menggagalkan SELURUH provisioning tenant.
     */
    seedFromIndustryTemplate(industryTemplateId: string): Promise<SeedFromIndustryTemplateResult>;
}
