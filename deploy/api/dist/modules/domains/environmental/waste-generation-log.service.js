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
exports.WasteGenerationLogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const environmental_context_1 = require("./environmental-context");
/**
 * Task 5.2 (Modul 12 §4.3 poin 1, §3 "TPS LB3 Officer/Waste Handler | environmental.waste_generation_log.create").
 * BELUM ada controller HTTP.
 */
let WasteGenerationLogService = class WasteGenerationLogService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const recordedBy = (0, environmental_context_1.requireActorUserId)();
        const tenantId = (0, environmental_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.wasteGenerationLog.create({
            data: {
                tenantId,
                siteId: input.siteId,
                departmentId: input.departmentId,
                logDate: input.logDate,
                wasteCode: input.wasteCode,
                wasteName: input.wasteName,
                wasteType: input.wasteType,
                quantityGenerated: input.quantityGenerated,
                unitOfMeasure: input.unitOfMeasure,
                storageLocation: input.storageLocation,
                storageStartDate: input.storageStartDate,
                maxStorageDurationDays: input.maxStorageDurationDays,
                cumulativeStoredQuantity: input.cumulativeStoredQuantity,
                recordedBy,
                createdBy: recordedBy,
                updatedBy: recordedBy,
            },
        }));
    }
    /** PRD §4.3 poin 2 — "waste_manifest_records mereferensikan akumulasi waste_generation_log terkait." */
    async linkToManifest(wasteGenerationLogId, wasteManifestId) {
        const updatedBy = (0, environmental_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.wasteGenerationLog.update({ where: { id: wasteGenerationLogId }, data: { linkedWasteManifestId: wasteManifestId, updatedBy } }));
    }
    /** Idempotency BR-03 (H-7 warning) — dipanggil waste-storage-duration-scan. */
    async markStorageDurationWarningSent(wasteGenerationLogId) {
        return this.prisma.withRls((tx) => tx.wasteGenerationLog.update({ where: { id: wasteGenerationLogId }, data: { storageDurationWarningSentAt: new Date() } }));
    }
    async getById(wasteGenerationLogId) {
        return this.prisma.withRls((tx) => tx.wasteGenerationLog.findUniqueOrThrow({ where: { id: wasteGenerationLogId } }));
    }
    async listBySite(siteId) {
        return this.prisma.withRls((tx) => tx.wasteGenerationLog.findMany({ where: { siteId }, orderBy: { logDate: "desc" } }));
    }
};
exports.WasteGenerationLogService = WasteGenerationLogService;
exports.WasteGenerationLogService = WasteGenerationLogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WasteGenerationLogService);
//# sourceMappingURL=waste-generation-log.service.js.map