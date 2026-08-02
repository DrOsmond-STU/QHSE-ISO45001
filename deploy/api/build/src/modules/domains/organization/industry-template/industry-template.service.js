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
exports.IndustryTemplateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const organization_context_1 = require("../organization-context");
// Task 1.2 (Modul 01 §3/§5) — katalog GLOBAL platform (bukan tabel domain
// tenant, TIDAK ADA tenant_id sama sekali), dikelola Super Admin Platform
// (org.industry_template.manage). Pola akses beda dari OrganizationService:
// pakai prisma.withGlobalContext() (task 1.2, platform/tenancy/prisma.service.ts)
// BUKAN withRls() — listActive()/findByCode() bahkan HARUS bisa dipanggil
// TANPA tenant context sama sekali (dipakai setup wizard SEBELUM tenant baru
// dibuat, PRD §4.1 langkah 2 "pemilihan template industri" mendahului
// "pembuatan struktur inti"). BELUM ada controller HTTP (pola sama seluruh
// task 1.1 — dites langsung, endpoint menyusul begitu ada task yang
// eksplisit memintanya).
//
// Catalog authoring UTAMA lewat prisma/seed-industry-templates.ts (TDD §6.3
// "data referensi ... di-seed lewat migration terkontrol versi") — method
// create/update/deactivate di sini melayani org.industry_template.manage
// runtime (Super Admin Platform mengubah katalog tanpa redeploy), BUKAN
// jalur seed itu sendiri.
let IndustryTemplateService = class IndustryTemplateService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listActive() {
        return this.prisma.industryTemplate.findMany({ where: { isActive: true }, orderBy: { code: "asc" } });
    }
    async findByCode(code) {
        return this.prisma.industryTemplate.findUnique({ where: { code } });
    }
    /** Dipakai OrganizationService saat assign industry_template_id ke
     * tenant/company (PRD §4.1) — template harus ADA dan AKTIF; menugaskan
     * template tidak dikenal/nonaktif ditolak fail closed (bukan diam-diam
     * disimpan sebagai UUID yatim). */
    async getActiveOrThrow(industryTemplateId) {
        const template = await this.prisma.industryTemplate.findUnique({ where: { id: industryTemplateId } });
        if (!template || !template.isActive) {
            throw new common_1.NotFoundException(`industry_template_id "${industryTemplateId}" tidak ditemukan atau tidak aktif.`);
        }
        return template;
    }
    async create(input) {
        return (0, organization_context_1.withCleanUniqueViolation)(() => this.prisma.withGlobalContext((tx) => tx.industryTemplate.create({
            data: {
                code: input.code,
                name: input.name,
                description: input.description,
                defaultRegulatoryCodes: input.defaultRegulatoryCodes ?? [],
                defaultChecklistRefs: input.defaultChecklistRefs ?? [],
                defaultModuleEntitlements: input.defaultModuleEntitlements ?? [],
                isSystemDefined: input.isSystemDefined ?? false,
            },
        })), `industry_template code "${input.code}" sudah dipakai.`);
    }
    async update(industryTemplateId, input) {
        return this.prisma.withGlobalContext((tx) => tx.industryTemplate.update({ where: { id: industryTemplateId }, data: input }));
    }
    /** BR-04 (PRD Modul 01 §6) — nonaktifkan (BUKAN hapus), supaya referensi
     * historis tenants/companies yang sudah memakainya tetap valid dan
     * regulatory_register yang sudah ada TIDAK retroaktif berubah (Modul 04
     * belum ada tabelnya Phase 1 — tidak ada yang perlu dilakukan di sini
     * selain isActive:false, lihat TDD §26). */
    async deactivate(industryTemplateId) {
        return this.prisma.withGlobalContext((tx) => tx.industryTemplate.update({ where: { id: industryTemplateId }, data: { isActive: false } }));
    }
};
exports.IndustryTemplateService = IndustryTemplateService;
exports.IndustryTemplateService = IndustryTemplateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IndustryTemplateService);
