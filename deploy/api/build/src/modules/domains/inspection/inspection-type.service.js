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
exports.InspectionTypeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const inspection_context_1 = require("./inspection-context");
// Task 3.6 (Modul 08 §3 "Tenant Admin | inspection.type.manage"). BELUM ada
// controller HTTP (pola sama seluruh modul domain Phase 2+). `code`
// SENGAJA VARCHAR bebas (bukan enum) — PRD §2.1 "dan tipe custom lain".
let InspectionTypeService = class InspectionTypeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, inspection_context_1.requireActorUserId)();
        const tenantId = (0, inspection_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.inspectionType.create({
            data: { tenantId, code: input.code, name: input.name, description: input.description, createdBy, updatedBy: createdBy },
        }));
    }
    async getById(inspectionTypeId) {
        return this.prisma.withRls((tx) => tx.inspectionType.findUniqueOrThrow({ where: { id: inspectionTypeId } }));
    }
    async listActive() {
        return this.prisma.withRls((tx) => tx.inspectionType.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }));
    }
    async retire(inspectionTypeId) {
        const updatedBy = (0, inspection_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.inspectionType.update({ where: { id: inspectionTypeId }, data: { isActive: false, deletedAt: new Date(), updatedBy } }));
    }
};
exports.InspectionTypeService = InspectionTypeService;
exports.InspectionTypeService = InspectionTypeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InspectionTypeService);
