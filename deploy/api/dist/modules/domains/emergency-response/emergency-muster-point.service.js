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
exports.EmergencyMusterPointService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const emergency_response_context_1 = require("./emergency-response-context");
// Task 3.7 (Modul 14 §5) — master titik kumpul, referensi bagi plan/drill/
// check-in (PRD §5 "diperlukan sbg referensi"). BELUM ada controller HTTP
// (pola sama seluruh modul domain Phase 2+).
let EmergencyMusterPointService = class EmergencyMusterPointService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, emergency_response_context_1.requireActorUserId)();
        const tenantId = (0, emergency_response_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.emergencyMusterPoint.create({
            data: {
                tenantId,
                siteId: input.siteId,
                musterPointCode: input.musterPointCode,
                musterPointName: input.musterPointName,
                locationDescription: input.locationDescription,
                gpsLat: input.gpsLat,
                gpsLong: input.gpsLong,
                capacityEstimate: input.capacityEstimate,
                isActive: true,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async getById(musterPointId) {
        return this.prisma.withRls((tx) => tx.emergencyMusterPoint.findUniqueOrThrow({ where: { id: musterPointId } }));
    }
    async listActiveBySite(siteId) {
        return this.prisma.withRls((tx) => tx.emergencyMusterPoint.findMany({ where: { siteId, isActive: true, deletedAt: null }, orderBy: { musterPointName: "asc" } }));
    }
    async deactivate(musterPointId) {
        const updatedBy = (0, emergency_response_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.emergencyMusterPoint.update({ where: { id: musterPointId }, data: { isActive: false, updatedBy } }));
    }
};
exports.EmergencyMusterPointService = EmergencyMusterPointService;
exports.EmergencyMusterPointService = EmergencyMusterPointService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmergencyMusterPointService);
//# sourceMappingURL=emergency-muster-point.service.js.map