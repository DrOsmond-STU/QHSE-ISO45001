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
exports.WorkPermitTypeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const work_permit_context_1 = require("./work-permit-context");
// Task 3.3 (Modul 06 §3 "Tenant Admin | work_permit.type.manage", §5).
// BELUM ada controller HTTP (pola sama seluruh modul domain Phase 2+).
// `code` SENGAJA VARCHAR bebas (bukan enum) — lihat banner comment
// schema.prisma WorkPermitType (PRD §2.1 "dan tipe custom lain").
let WorkPermitTypeService = class WorkPermitTypeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, work_permit_context_1.requireActorUserId)();
        const tenantId = (0, work_permit_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.workPermitType.create({
            data: {
                tenantId,
                code: input.code,
                name: input.name,
                description: input.description,
                requiresGasTest: input.requiresGasTest ?? false,
                requiresLoto: input.requiresLoto ?? false,
                requiresHseApproval: input.requiresHseApproval ?? false,
                defaultRiskLevel: input.defaultRiskLevel ?? "LOW",
                defaultValidityHours: input.defaultValidityHours ?? 8,
                maxExtensionCount: input.maxExtensionCount ?? 1,
                gasRetestIntervalHours: input.gasRetestIntervalHours,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async update(workPermitTypeId, input) {
        const updatedBy = (0, work_permit_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.workPermitType.update({ where: { id: workPermitTypeId }, data: { ...input, updatedBy } }));
    }
    async getById(workPermitTypeId) {
        return this.prisma.withRls((tx) => tx.workPermitType.findUniqueOrThrow({ where: { id: workPermitTypeId } }));
    }
    async listActive() {
        return this.prisma.withRls((tx) => tx.workPermitType.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }));
    }
    /** Soft delete (deletedAt + isActive false) — pola sama seluruh service
     * "type"/"category" config lain di codebase ini. TIDAK ADA BR referensial
     * literal PRD utk tipe yang masih dipakai work_permits AKTIF (beda dari
     * hazard_register BR-07, Modul 05) — retire() TIDAK memvalidasi referensi,
     * gap TDD §26. */
    async retire(workPermitTypeId) {
        const updatedBy = (0, work_permit_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.workPermitType.update({ where: { id: workPermitTypeId }, data: { isActive: false, deletedAt: new Date(), updatedBy } }));
    }
};
exports.WorkPermitTypeService = WorkPermitTypeService;
exports.WorkPermitTypeService = WorkPermitTypeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkPermitTypeService);
