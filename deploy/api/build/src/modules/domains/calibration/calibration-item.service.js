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
exports.CalibrationItemService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const calibration_context_1 = require("./calibration-context");
let CalibrationItemService = class CalibrationItemService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    // BR-01 — asset hanya boleh py 1 calibration_items (TERPENUHI BY
    // CONSTRUCTION via @unique(assetId), lihat banner comment schema.prisma
    // blok Modul 16) — P2002 dari Prisma dibiarkan propagate apa adanya kalau
    // caller mencoba dobel, tidak perlu pre-check terpisah yang bisa race.
    async create(input) {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        const asset = await this.prisma.withRls((tx) => tx.asset.findUniqueOrThrow({ where: { id: input.assetId }, select: { siteId: true, assetCode: true, isSafetyCritical: true } }));
        return this.prisma.withRls((tx) => tx.calibrationItem.create({
            data: {
                tenantId,
                assetId: input.assetId,
                siteId: asset.siteId,
                departmentId: input.departmentId,
                // Didenormalisasi dari assets.assetCode — lihat banner comment
                // schema.prisma poin (4).
                equipmentTagNo: asset.assetCode,
                measurementParameter: input.measurementParameter,
                measurementRangeMin: input.measurementRangeMin,
                measurementRangeMax: input.measurementRangeMax,
                measurementRangeUnit: input.measurementRangeUnit,
                accuracyClass: input.accuracyClass,
                resolution: input.resolution,
                calibrationIntervalMonths: input.calibrationIntervalMonths,
                calibrationMethodStandard: input.calibrationMethodStandard,
                // PRD §5 — default dari assets.is_safety_critical, dapat di-override manual.
                isCriticalMeasurement: input.isCriticalMeasurement ?? asset.isSafetyCritical,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    async update(id, input) {
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.calibrationItem.update({
            where: { id },
            data: {
                departmentId: input.departmentId,
                measurementParameter: input.measurementParameter,
                measurementRangeMin: input.measurementRangeMin,
                measurementRangeMax: input.measurementRangeMax,
                measurementRangeUnit: input.measurementRangeUnit,
                accuracyClass: input.accuracyClass,
                resolution: input.resolution,
                calibrationIntervalMonths: input.calibrationIntervalMonths,
                calibrationMethodStandard: input.calibrationMethodStandard,
                isCriticalMeasurement: input.isCriticalMeasurement,
                calibrationStatus: input.calibrationStatus,
                updatedBy: actorUserId,
            },
        }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.calibrationItem.findUniqueOrThrow({ where: { id } }));
    }
    async list() {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.calibrationItem.findMany({ where: { tenantId, deletedAt: null }, orderBy: { equipmentTagNo: "asc" } }));
    }
    // BR-08 — dipanggil AssetSiteChangeListener (event ASSET_SITE_CHANGED_EVENT,
    // ditambahkan retroaktif ke AssetTransferService.transfer() 6.1) begitu
    // lokasi assets.site_id berubah, lihat banner comment schema.prisma poin (2).
    async syncSiteId(assetId, newSiteId) {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        await this.prisma.withRls((tx) => tx.calibrationItem.updateMany({ where: { tenantId, assetId }, data: { siteId: newSiteId } }));
    }
};
exports.CalibrationItemService = CalibrationItemService;
exports.CalibrationItemService = CalibrationItemService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalibrationItemService);
