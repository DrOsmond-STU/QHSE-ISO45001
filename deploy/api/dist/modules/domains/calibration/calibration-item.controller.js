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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationItemController = void 0;
const common_1 = require("@nestjs/common");
const require_permission_decorator_1 = require("../../../platform/rbac/require-permission.decorator");
const list_query_dto_1 = require("../../../platform/common/list-query.dto");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const tenant_context_1 = require("../../../platform/tenancy/tenant-context");
function requireTenantId() {
    const tenantId = (0, tenant_context_1.getCurrentTenantId)();
    if (!tenantId)
        throw new Error("Tenant context tidak ditemukan — request ditolak (fail closed).");
    return tenantId;
}
// Endpoint HTTP READ-ONLY demo utk domain Calibration Management (Modul
// 16) — GET list+detail calibration_items, pola sama document.controller.ts
// (DMS) — scope MINIMAL sekadar demo Postman.
let CalibrationItemController = class CalibrationItemController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(query) {
        const tenantId = requireTenantId();
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(100, Math.max(1, query.limit ?? 20));
        return this.prisma.withRls(async (tx) => {
            const [data, total] = await Promise.all([
                tx.calibrationItem.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
                tx.calibrationItem.count({ where: { tenantId } }),
            ]);
            return { data, meta: { page, limit, total } };
        });
    }
    async getById(id) {
        const record = await this.prisma.withRls((tx) => tx.calibrationItem.findUniqueOrThrow({ where: { id } }));
        return { data: record };
    }
};
exports.CalibrationItemController = CalibrationItemController;
__decorate([
    (0, require_permission_decorator_1.RequirePermission)("calibration.item.read"),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_query_dto_1.ListQueryDto]),
    __metadata("design:returntype", Promise)
], CalibrationItemController.prototype, "list", null);
__decorate([
    (0, require_permission_decorator_1.RequirePermission)("calibration.item.read"),
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalibrationItemController.prototype, "getById", null);
exports.CalibrationItemController = CalibrationItemController = __decorate([
    (0, common_1.Controller)("calibration-items"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalibrationItemController);
//# sourceMappingURL=calibration-item.controller.js.map