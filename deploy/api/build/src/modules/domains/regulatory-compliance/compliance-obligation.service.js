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
exports.ComplianceObligationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const regulatory_register_rules_1 = require("./regulatory-register-rules");
const regulatory_compliance_context_1 = require("./regulatory-compliance-context");
// Task 2.2 (Modul 04 §4.1 poin 3/§6 BR-04). BELUM ada controller HTTP (pola
// sama seluruh modul domain Phase 2 sejauh ini tanpa deliverable apps/web)
// — compliance.obligation.manage/read sudah di-seed RBAC baseline (task 92).
let ComplianceObligationService = class ComplianceObligationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * BR-04 (PRD §6) — register SUPERSEDED/REVOKED tidak boleh jadi acuan
     * obligation BARU. Status register dibaca DI DALAM transaksi yang sama
     * dgn create (bukan query terpisah sebelumnya) supaya tidak ada celah
     * TOCTOU antara pengecekan dan penulisan.
     */
    async create(input) {
        const createdBy = (0, regulatory_compliance_context_1.requireActorUserId)();
        const tenantId = (0, regulatory_compliance_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const register = await tx.regulatoryRegister.findUniqueOrThrow({ where: { id: input.regulatoryRegisterId } });
            (0, regulatory_register_rules_1.assertRegisterAcceptsNewObligation)(register.status);
            return tx.complianceObligation.create({
                data: {
                    tenantId,
                    regulatoryRegisterId: input.regulatoryRegisterId,
                    obligationCode: input.obligationCode,
                    clauseReference: input.clauseReference,
                    obligationDescription: input.obligationDescription,
                    obligationType: input.obligationType,
                    responsibleUserId: input.responsibleUserId,
                    responsibleDepartmentId: input.responsibleDepartmentId,
                    applicableSiteId: input.applicableSiteId,
                    frequency: input.frequency,
                    nextDueDate: input.nextDueDate,
                    status: "ACTIVE",
                    createdBy,
                    updatedBy: createdBy,
                },
            });
        });
    }
    async update(obligationId, input) {
        const updatedBy = (0, regulatory_compliance_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.complianceObligation.update({
            where: { id: obligationId },
            data: { ...input, updatedBy },
        }));
    }
    async getById(obligationId) {
        return this.prisma.withRls((tx) => tx.complianceObligation.findUniqueOrThrow({ where: { id: obligationId } }));
    }
    async listByRegister(regulatoryRegisterId) {
        return this.prisma.withRls((tx) => tx.complianceObligation.findMany({
            where: { regulatoryRegisterId, deletedAt: null },
            orderBy: { createdAt: "asc" },
        }));
    }
    /** PRD §2.2/§6 — obligation tidak lagi berlaku (mis. regulasi dicabut
     * tapi jejak historis evaluasi terkait tetap harus tersimpan) — status
     * RETIRED (BUKAN delete), pola sama IndustryTemplateService.deactivate()
     * (1.2)/DocumentService.retire() (2.1). */
    async retire(obligationId) {
        const updatedBy = (0, regulatory_compliance_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.complianceObligation.update({
            where: { id: obligationId },
            data: { status: "RETIRED", updatedBy },
        }));
    }
};
exports.ComplianceObligationService = ComplianceObligationService;
exports.ComplianceObligationService = ComplianceObligationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ComplianceObligationService);
