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
exports.MaintenanceRecordService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const asset_service_1 = require("./asset.service");
const asset_equipment_context_1 = require("./asset-equipment-context");
const asset_lifecycle_1 = require("./asset-lifecycle");
let MaintenanceRecordService = class MaintenanceRecordService {
    prisma;
    assetService;
    constructor(prisma, assetService) {
        this.prisma = prisma;
        this.assetService = assetService;
    }
    async create(input) {
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        const actorUserId = (0, asset_equipment_context_1.requireActorUserId)();
        const record = await this.prisma.withRls((tx) => tx.maintenanceRecord.create({
            data: {
                tenantId,
                assetId: input.assetId,
                maintenanceScheduleId: input.maintenanceScheduleId,
                performedDate: input.performedDate,
                performedBy: input.performedBy,
                findings: input.findings,
                resultCondition: input.resultCondition,
                cost: input.cost,
                createdBy: actorUserId,
            },
        }));
        // PRD §5 maintenance_records "Update assets.condition_status".
        const asset = await this.prisma.withRls((tx) => tx.asset.update({ where: { id: input.assetId }, data: { conditionStatus: input.resultCondition, updatedBy: actorUserId } }));
        // PRD §5 maintenance_schedules.next_due_date "Dihitung otomatis dari
        // maintenance terakhir" — recompute HANYA kalau record ini tertaut ke
        // schedule (non-terjadwal/korektif ringan, maintenanceScheduleId null,
        // TIDAK mengubah jadwal apa pun, PRD §5 literal).
        if (input.maintenanceScheduleId) {
            const schedule = await this.prisma.withRls((tx) => tx.maintenanceSchedule.findUniqueOrThrow({ where: { id: input.maintenanceScheduleId } }));
            const nextDueDate = (0, asset_lifecycle_1.calculateNextDueDate)(input.performedDate, schedule.intervalType, schedule.intervalValue);
            if (nextDueDate) {
                // Siklus baru dimulai — reset KEDUA idempotency reminder (gap TDD
                // §26, lihat banner comment schema.prisma), atau H-7/overdue siklus
                // BERIKUTNYA tidak akan pernah terkirim (flag lama masih "sent").
                await this.prisma.withRls((tx) => tx.maintenanceSchedule.update({
                    where: { id: schedule.id },
                    data: { nextDueDate, dueSoonReminderSentAt: null, overdueNotifiedAt: null, updatedBy: actorUserId },
                }));
            }
            // RUNNING_HOURS (nextDueDate null) — jadwal dibiarkan TIDAK berubah,
            // lihat banner comment calculateNextDueDate()/CreateMaintenanceScheduleInput.
        }
        // BR-04.
        await this.assetService.alertIfOutOfServiceSafetyCritical(asset);
        return record;
    }
    async listByAsset(assetId) {
        const tenantId = (0, asset_equipment_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.maintenanceRecord.findMany({ where: { tenantId, assetId }, orderBy: { performedDate: "desc" } }));
    }
};
exports.MaintenanceRecordService = MaintenanceRecordService;
exports.MaintenanceRecordService = MaintenanceRecordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        asset_service_1.AssetService])
], MaintenanceRecordService);
//# sourceMappingURL=maintenance-record.service.js.map