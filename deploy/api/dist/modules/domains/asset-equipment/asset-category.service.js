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
exports.AssetCategoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const asset_equipment_context_1 = require("./asset-equipment-context");
let AssetCategoryService = class AssetCategoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        const actorUserId = (0, asset_equipment_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.assetCategory.create({
            data: {
                tenantId,
                categoryName: input.categoryName,
                parentCategoryId: input.parentCategoryId,
                defaultIsSafetyCritical: input.defaultIsSafetyCritical ?? false,
                requiresDisposalApproval: input.requiresDisposalApproval ?? false,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    async update(id, input) {
        const actorUserId = (0, asset_equipment_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.assetCategory.update({
            where: { id },
            data: {
                categoryName: input.categoryName,
                parentCategoryId: input.parentCategoryId,
                defaultIsSafetyCritical: input.defaultIsSafetyCritical,
                requiresDisposalApproval: input.requiresDisposalApproval,
                updatedBy: actorUserId,
            },
        }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.assetCategory.findUniqueOrThrow({ where: { id } }));
    }
    async list() {
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.assetCategory.findMany({ where: { tenantId, deletedAt: null }, orderBy: { categoryName: "asc" } }));
    }
    async softDelete(id) {
        const actorUserId = (0, asset_equipment_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.assetCategory.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorUserId } }));
    }
};
exports.AssetCategoryService = AssetCategoryService;
exports.AssetCategoryService = AssetCategoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AssetCategoryService);
//# sourceMappingURL=asset-category.service.js.map