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
exports.MaintenanceScheduleService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const asset_equipment_context_1 = require("./asset-equipment-context");
let MaintenanceScheduleService = class MaintenanceScheduleService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        const actorUserId = (0, asset_equipment_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.maintenanceSchedule.create({
            data: {
                tenantId,
                assetId: input.assetId,
                maintenanceType: input.maintenanceType,
                intervalType: input.intervalType,
                intervalValue: input.intervalValue,
                nextDueDate: input.nextDueDate,
                responsibleRoleId: input.responsibleRoleId,
                isActive: true,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    async update(id, input) {
        const actorUserId = (0, asset_equipment_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.maintenanceSchedule.update({
            where: { id },
            data: {
                maintenanceType: input.maintenanceType,
                intervalType: input.intervalType,
                intervalValue: input.intervalValue,
                nextDueDate: input.nextDueDate,
                // nextDueDate diubah manual (mis. ditunda) — siklus reminder ikut
                // reset, pola sama MaintenanceRecordService.create() (gap TDD §26).
                dueSoonReminderSentAt: input.nextDueDate ? null : undefined,
                overdueNotifiedAt: input.nextDueDate ? null : undefined,
                responsibleRoleId: input.responsibleRoleId,
                isActive: input.isActive,
                updatedBy: actorUserId,
            },
        }));
    }
    async listDueByAsset(assetId) {
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.maintenanceSchedule.findMany({ where: { tenantId, assetId, isActive: true, deletedAt: null }, orderBy: { nextDueDate: "asc" } }));
    }
};
exports.MaintenanceScheduleService = MaintenanceScheduleService;
exports.MaintenanceScheduleService = MaintenanceScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MaintenanceScheduleService);
//# sourceMappingURL=maintenance-schedule.service.js.map