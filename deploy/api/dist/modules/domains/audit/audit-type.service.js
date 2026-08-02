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
exports.AuditTypeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const audit_context_1 = require("./audit-context");
// Task 4.1 (Modul 09 §3 "Audit Program Owner/MR | audit.type.manage"). BELUM
// ada controller HTTP (pola sama seluruh modul domain Phase 2+). `code`
// SENGAJA VARCHAR bebas (bukan enum) — PRD §5 daftar contoh
// (INTERNAL/EXTERNAL/SURVEILLANCE/CERTIFICATION/SUPPLIER/OTHER) sekadar
// contoh, bukan enum tertutup.
let AuditTypeService = class AuditTypeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.auditType.create({
            data: {
                tenantId,
                code: input.code,
                name: input.name,
                description: input.description,
                requiresExternalBody: input.requiresExternalBody ?? false,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async getById(auditTypeId) {
        return this.prisma.withRls((tx) => tx.auditType.findUniqueOrThrow({ where: { id: auditTypeId } }));
    }
    async listActive() {
        return this.prisma.withRls((tx) => tx.auditType.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }));
    }
    async retire(auditTypeId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.auditType.update({ where: { id: auditTypeId }, data: { isActive: false, deletedAt: new Date(), updatedBy } }));
    }
};
exports.AuditTypeService = AuditTypeService;
exports.AuditTypeService = AuditTypeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditTypeService);
//# sourceMappingURL=audit-type.service.js.map