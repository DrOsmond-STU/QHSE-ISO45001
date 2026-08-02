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
exports.InspectionNumberingBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const inspection_context_1 = require("./inspection-context");
const INSPECTION_MODULE_CODE = "INSPECTION";
const INSPECTION_NUMBERING_PATTERN = "{PREFIX}/{SITE_CODE}/{YYYY}/{SEQ:5}";
/**
 * Task 3.6 — pola PERSIS WorkPermitWorkflowBootstrapService.ensureNumberingConfig()
 * (3.3)/IncidentWorkflowBootstrapService (3.5), TAPI modul ini TIDAK PUNYA
 * workflow_definitions sama sekali (PRD §4 poin 9 "TIDAK WAJIB memakai
 * Workflow Engine", TIDAK diimplementasikan — gap TDD §26) — service ini
 * HANYA menangani numbering, bukan "Workflow" seperti nama precedent modul
 * lain. PRD §5 "Numbering" — reset_period=MONTHLY (BEDA dari SELURUH modul
 * lain yang pakai YEARLY — PERTAMA di codebase yang genuinely menguji
 * reset_period=MONTHLY NumberingService, sudah didukung sejak task 0.10
 * tapi baru di sini benar2 dipakai), scope_level=SITE (pola sama Work
 * Permit/Incident), SEQ:5 digit (5 digit BEDA dari SEQ:4 modul lain — PRD
 * §11 "volume tinggi").
 */
let InspectionNumberingBootstrapService = class InspectionNumberingBootstrapService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureNumberingConfig(siteId) {
        const tenantId = (0, inspection_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode: INSPECTION_MODULE_CODE, scopeId: siteId } });
            if (existing)
                return existing;
            return tx.numberingConfig.create({
                data: {
                    tenantId,
                    moduleCode: INSPECTION_MODULE_CODE,
                    pattern: INSPECTION_NUMBERING_PATTERN,
                    prefix: "INS",
                    resetPeriod: "MONTHLY",
                    scopeLevel: "SITE",
                    scopeId: siteId,
                },
            });
        });
    }
};
exports.InspectionNumberingBootstrapService = InspectionNumberingBootstrapService;
exports.InspectionNumberingBootstrapService = InspectionNumberingBootstrapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InspectionNumberingBootstrapService);
//# sourceMappingURL=inspection-numbering-bootstrap.service.js.map