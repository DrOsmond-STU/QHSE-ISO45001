"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegulatoryRegisterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const industry_template_service_1 = require("../organization/industry-template/industry-template.service");
const regulatory_register_rules_1 = require("./regulatory-register-rules");
const regulatory_compliance_context_1 = require("./regulatory-compliance-context");
// PRD Modul 04 §5 "kategori framework -> jenis regulasi default" — dipakai
// HANYA oleh seedFromIndustryTemplate() saat mengarang baris awal dari
// katalog global (RegulatoryFramework tidak punya field regulation_type
// sendiri, PRD §5 tidak memintanya di situ). Pemetaan kasar/best-effort;
// Compliance Officer diharapkan "melengkapi/menyesuaikan register" (PRD
// §4.1 poin 2) termasuk mengoreksi regulation_type kalau perlu.
const DEFAULT_REGULATION_TYPE_BY_CATEGORY = {
    ISO_STANDARD: "INTERNATIONAL_STANDARD",
    GOVERNMENT_REGULATION: "GOVERNMENT_REGULATION_PP",
    INDUSTRY_GUIDELINE: "GUIDELINE",
};
// Task 2.2 (Modul 04 §4.1/§5/§6 BR-04/BR-07). BELUM ada controller HTTP
// (pola sama seluruh modul domain lain tanpa deliverable apps/web di Phase
// 2 sejauh ini) — compliance.regulation.* sudah di-seed RBAC baseline
// (task 92), siap digerbangi @RequirePermission begitu ada endpoint.
let RegulatoryRegisterService = class RegulatoryRegisterService {
    prisma;
    industryTemplateService;
    constructor(prisma, industryTemplateService) {
        this.prisma = prisma;
        this.industryTemplateService = industryTemplateService;
    }
    async create(input) {
        const createdBy = (0, regulatory_compliance_context_1.requireActorUserId)();
        const tenantId = (0, regulatory_compliance_context_1.requireTenantId)();
        const applicableScope = input.applicableScope ?? "ALL_TENANT";
        (0, regulatory_register_rules_1.assertApplicableScopeConsistency)(applicableScope, input.applicableCompanyId ?? null, input.applicableSiteId ?? null);
        return this.prisma.withRls((tx) => tx.regulatoryRegister.create({
            data: {
                tenantId,
                frameworkId: input.frameworkId,
                regulationType: input.regulationType,
                regulationNumber: input.regulationNumber,
                title: input.title,
                issuingAuthority: input.issuingAuthority,
                issueDate: input.issueDate,
                effectiveDate: input.effectiveDate,
                applicableScope,
                applicableCompanyId: input.applicableCompanyId,
                applicableSiteId: input.applicableSiteId,
                industryRelevance: input.industryRelevance ?? [],
                summary: input.summary,
                sourceUrl: input.sourceUrl,
                reviewCycleMonths: input.reviewCycleMonths,
                status: "ACTIVE",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async update(registerId, input) {
        const updatedBy = (0, regulatory_compliance_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.regulatoryRegister.findUniqueOrThrow({ where: { id: registerId } });
            const nextScope = input.applicableScope ?? existing.applicableScope;
            const nextCompanyId = "applicableCompanyId" in input ? (input.applicableCompanyId ?? null) : existing.applicableCompanyId;
            const nextSiteId = "applicableSiteId" in input ? (input.applicableSiteId ?? null) : existing.applicableSiteId;
            (0, regulatory_register_rules_1.assertApplicableScopeConsistency)(nextScope, nextCompanyId, nextSiteId);
            return tx.regulatoryRegister.update({
                where: { id: registerId },
                data: { ...input, updatedBy },
            });
        });
    }
    async getById(registerId) {
        return this.prisma.withRls((tx) => tx.regulatoryRegister.findUniqueOrThrow({ where: { id: registerId } }));
    }
    async listActive() {
        return this.prisma.withRls((tx) => tx.regulatoryRegister.findMany({ where: { status: "ACTIVE", deletedAt: null }, orderBy: { title: "asc" } }));
    }
    /**
     * PRD §4.1 poin 3 (implisit) — register lama diganti register baru
     * (perubahan regulasi/revisi). status -> SUPERSEDED/REVOKED (BUKAN
     * delete, BR-04 tetap membiarkan obligation historis yang sudah menunjuk
     * ke baris ini apa adanya — lihat regulatory-register-rules.ts). Kalau
     * ada penerus, supersededByRegisterId diisi (unique — satu register lama
     * hanya bisa digantikan SATU register baru, ditegakkan constraint DB).
     */
    async retire(registerId, status, supersededByRegisterId) {
        const updatedBy = (0, regulatory_compliance_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.regulatoryRegister.findUniqueOrThrow({ where: { id: registerId } });
            if (existing.status !== "ACTIVE") {
                throw new common_1.NotFoundException(`regulatory_register ${registerId} sudah berstatus ${existing.status}, bukan ACTIVE.`);
            }
            return tx.regulatoryRegister.update({
                where: { id: registerId },
                data: { status, supersededByRegisterId, updatedBy },
            });
        });
    }
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
    async seedFromIndustryTemplate(industryTemplateId) {
        const createdBy = (0, regulatory_compliance_context_1.requireActorUserId)();
        const tenantId = (0, regulatory_compliance_context_1.requireTenantId)();
        const template = await this.industryTemplateService.getActiveOrThrow(industryTemplateId);
        const codes = Array.isArray(template.defaultRegulatoryCodes) ? template.defaultRegulatoryCodes : [];
        const created = [];
        const skippedCodes = [];
        for (const rawCode of codes) {
            if (typeof rawCode !== "string")
                continue;
            const framework = await this.prisma.regulatoryFramework.findUnique({ where: { code: rawCode } });
            if (!framework || !framework.isActive) {
                skippedCodes.push(rawCode);
                continue;
            }
            const row = await this.prisma.withRls((tx) => tx.regulatoryRegister.create({
                data: {
                    tenantId,
                    frameworkId: framework.id,
                    regulationType: DEFAULT_REGULATION_TYPE_BY_CATEGORY[framework.category],
                    regulationNumber: framework.code,
                    title: framework.name,
                    summary: framework.description,
                    applicableScope: "ALL_TENANT",
                    industryRelevance: [template.code],
                    status: "ACTIVE",
                    createdBy,
                    updatedBy: createdBy,
                },
            }));
            created.push(row);
        }
        return { created, skippedCodes };
    }
};
exports.RegulatoryRegisterService = RegulatoryRegisterService;
exports.RegulatoryRegisterService = RegulatoryRegisterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        industry_template_service_1.IndustryTemplateService])
], RegulatoryRegisterService);
