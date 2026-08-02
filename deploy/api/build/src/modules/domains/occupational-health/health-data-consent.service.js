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
exports.HealthDataConsentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const occupational_health_context_1 = require("./occupational-health-context");
// PRD §4.6 — consent per tujuan pemrosesan (§11 UU PDP), TANPA field
// [ENCRYPTED] (bukan data klinis, hanya metadata persetujuan) — CRUD
// sederhana, tidak melalui dual-gate BR-02 (bukan data klinis mentah).
let HealthDataConsentService = class HealthDataConsentService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async grant(input) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.healthDataConsent.create({
            data: {
                tenantId,
                employeeUserId: input.employeeUserId,
                consentPurpose: input.consentPurpose,
                consentStatus: "GRANTED",
                consentGivenAt: input.consentGivenAt,
                consentChannel: input.consentChannel,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    async withdraw(id, withdrawalReason) {
        const actorUserId = (0, occupational_health_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.healthDataConsent.update({
            where: { id },
            data: {
                consentStatus: "WITHDRAWN",
                withdrawalDate: new Date(),
                withdrawalReason,
                updatedBy: actorUserId,
            },
        }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.healthDataConsent.findUniqueOrThrow({ where: { id } }));
    }
    async listByEmployee(employeeUserId) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.healthDataConsent.findMany({ where: { tenantId, employeeUserId }, orderBy: { consentGivenAt: "desc" } }));
    }
};
exports.HealthDataConsentService = HealthDataConsentService;
exports.HealthDataConsentService = HealthDataConsentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HealthDataConsentService);
