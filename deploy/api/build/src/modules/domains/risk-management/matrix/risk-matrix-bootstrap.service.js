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
exports.RiskMatrixBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const default_risk_matrix_1 = require("./default-risk-matrix");
const risk_matrix_context_1 = require("./risk-matrix-context");
const DEFAULT_MATRIX_NAME = "Matriks Risiko K3 Standar 5x5";
// Task 3.1 — pola PERSIS DmsBootstrapService (2.1)/RegulatoryComplianceBootstrapService
// (2.2): lazy-create find-or-create idempotent, dipanggil begitu tenant
// PERTAMA KALI butuh matriks utk scope tertentu (task 3.2, saat HIRA/JSA/
// HIRADC/risk_register pertama dibuat) — BUKAN dipanggil dari
// ProvisioningService (1.5), pola konsisten sejak 2.1/2.2 (gap TDD §26,
// di luar timebox menyentuh ulang orkestrasi Phase 1 yang sudah shipped).
let RiskMatrixBootstrapService = class RiskMatrixBootstrapService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureDefaultMatrix(scope = "ALL") {
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        const createdBy = (0, risk_matrix_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.riskMatrixConfig.findFirst({
                where: { tenantId, applicableModuleScope: scope, isActive: true },
            });
            if (existing)
                return existing;
            const config = await tx.riskMatrixConfig.create({
                data: {
                    tenantId,
                    name: DEFAULT_MATRIX_NAME,
                    applicableModuleScope: scope,
                    likelihoodLevels: 5,
                    severityLevels: 5,
                    version: 1,
                    isActive: true,
                    createdBy,
                    updatedBy: createdBy,
                },
            });
            await tx.riskMatrixLevel.createMany({
                data: (0, default_risk_matrix_1.buildDefaultRiskMatrixLevels)().map((l) => ({ tenantId, riskMatrixConfigId: config.id, ...l })),
            });
            await tx.riskMatrixCell.createMany({
                data: (0, default_risk_matrix_1.buildDefaultRiskMatrixCells)().map((c) => ({ tenantId, riskMatrixConfigId: config.id, ...c })),
            });
            return config;
        });
    }
};
exports.RiskMatrixBootstrapService = RiskMatrixBootstrapService;
exports.RiskMatrixBootstrapService = RiskMatrixBootstrapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RiskMatrixBootstrapService);
