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
exports.CalibrationProviderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const calibration_context_1 = require("./calibration-context");
let CalibrationProviderService = class CalibrationProviderService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.calibrationProvider.create({
            data: {
                tenantId,
                providerName: input.providerName,
                providerType: input.providerType,
                accreditationBody: input.accreditationBody,
                accreditationNumber: input.accreditationNumber,
                accreditationScope: input.accreditationScope ?? undefined,
                accreditationValidUntil: input.accreditationValidUntil,
                address: input.address,
                contactPersonName: input.contactPersonName,
                contactPersonPhone: input.contactPersonPhone,
                contactPersonEmail: input.contactPersonEmail,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    async update(id, input) {
        const actorUserId = (0, calibration_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.calibrationProvider.update({
            where: { id },
            data: {
                providerName: input.providerName,
                providerType: input.providerType,
                accreditationBody: input.accreditationBody,
                accreditationNumber: input.accreditationNumber,
                accreditationScope: input.accreditationScope ?? undefined,
                accreditationValidUntil: input.accreditationValidUntil,
                address: input.address,
                contactPersonName: input.contactPersonName,
                contactPersonPhone: input.contactPersonPhone,
                contactPersonEmail: input.contactPersonEmail,
                isActive: input.isActive,
                updatedBy: actorUserId,
            },
        }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.calibrationProvider.findUniqueOrThrow({ where: { id } }));
    }
    async list() {
        const tenantId = (0, calibration_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.calibrationProvider.findMany({ where: { tenantId, deletedAt: null }, orderBy: { providerName: "asc" } }));
    }
};
exports.CalibrationProviderService = CalibrationProviderService;
exports.CalibrationProviderService = CalibrationProviderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalibrationProviderService);
