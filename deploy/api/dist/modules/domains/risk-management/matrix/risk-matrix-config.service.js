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
exports.RiskMatrixConfigService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const risk_matrix_context_1 = require("./risk-matrix-context");
// Task 3.1 (Modul 05 §5/§6 BR-09). BELUM ada controller HTTP (pola sama
// seluruh modul domain Phase 2+ sejauh ini tanpa deliverable apps/web) —
// risk.matrix_config.manage sudah di-seed RBAC baseline (task 104), siap
// digerbangi @RequirePermission begitu ada endpoint (mis. "Visual Builder
// Matriks Risiko" PRD §12).
let RiskMatrixConfigService = class RiskMatrixConfigService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Authoring matriks BARU (Visual Builder, PRD §12) — satu unit kerja
     * (config+levels+cells) ditulis SEKALIGUS dalam satu withRls(), TIDAK ADA
     * panggilan ke service lain yang membuka withRls()/$transaction sendiri
     * di dalamnya (aman dari pitfall nested-transaction 2.1). Partial unique
     * index (1 aktif per tenant+scope, task 103) menegakkan caller TIDAK
     * bisa create() kedua kali utk scope yang sudah py versi aktif — pesan
     * error diarahkan ke createNewVersion() sbg gantinya.
     */
    async create(input) {
        const createdBy = (0, risk_matrix_context_1.requireActorUserId)();
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        const scope = input.applicableModuleScope ?? "ALL";
        return (0, risk_matrix_context_1.withCleanUniqueViolation)(() => this.prisma.withRls(async (tx) => {
            const config = await tx.riskMatrixConfig.create({
                data: {
                    tenantId,
                    name: input.name,
                    applicableModuleScope: scope,
                    likelihoodLevels: input.likelihoodLevels ?? 5,
                    severityLevels: input.severityLevels ?? 5,
                    version: 1,
                    isActive: true,
                    createdBy,
                    updatedBy: createdBy,
                },
            });
            await tx.riskMatrixLevel.createMany({
                data: input.levels.map((l) => ({ tenantId, riskMatrixConfigId: config.id, ...l })),
            });
            await tx.riskMatrixCell.createMany({
                data: input.cells.map((c) => ({ tenantId, riskMatrixConfigId: config.id, ...c })),
            });
            return config;
        }), `Sudah ada risk_matrix_configs AKTIF utk scope=${scope} pada tenant ini — pakai createNewVersion() utk merevisi, bukan create() lagi.`);
    }
    /**
     * BR-09 (PRD §6) — "Perubahan risk_matrix_configs membuat versi BARU;
     * assessment yang sudah dibuat tetap mengacu versi lama, tidak berubah
     * skornya secara retroaktif." Baris LAMA disentuh HANYA utk isActive->false
     * (kolom lain SAMA SEKALI tidak diupdate) — deactivate dilakukan SEBELUM
     * insert baris baru dalam transaksi yang SAMA, supaya partial unique index
     * tidak pernah sempat melihat 2 baris aktif utk scope yang sama di titik
     * mana pun (bukan celah TOCTOU antara dua transaksi terpisah).
     */
    async createNewVersion(previousConfigId, input) {
        const createdBy = (0, risk_matrix_context_1.requireActorUserId)();
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const previous = await tx.riskMatrixConfig.findUniqueOrThrow({ where: { id: previousConfigId } });
            if (!previous.isActive) {
                throw new common_1.BadRequestException(`risk_matrix_configs ${previousConfigId} bukan versi aktif — hanya versi aktif yang bisa diversi-baru-kan.`);
            }
            await tx.riskMatrixConfig.update({ where: { id: previousConfigId }, data: { isActive: false, updatedBy: createdBy } });
            const config = await tx.riskMatrixConfig.create({
                data: {
                    tenantId,
                    name: input.name,
                    applicableModuleScope: previous.applicableModuleScope,
                    likelihoodLevels: input.likelihoodLevels ?? previous.likelihoodLevels,
                    severityLevels: input.severityLevels ?? previous.severityLevels,
                    version: previous.version + 1,
                    isActive: true,
                    createdBy,
                    updatedBy: createdBy,
                },
            });
            await tx.riskMatrixLevel.createMany({
                data: input.levels.map((l) => ({ tenantId, riskMatrixConfigId: config.id, ...l })),
            });
            await tx.riskMatrixCell.createMany({
                data: input.cells.map((c) => ({ tenantId, riskMatrixConfigId: config.id, ...c })),
            });
            return config;
        });
    }
    /**
     * PRD §5 "NULL berarti berlaku lebih luas"-style fallback (pola sama
     * DocumentService.listPublishedForCurrentUser() 2.1 utk site/department
     * NULL) — konfigurasi scope-spesifik (mis. HIRA) MENANG kalau ada &
     * aktif, baru fallback ke scope ALL kalau tidak. Dipakai task 3.2 saat
     * hira_assessments/dst butuh tahu matriks mana yang berlaku.
     */
    async resolveActiveConfig(scope) {
        return this.prisma.withRls(async (tx) => {
            const scopeSpecific = scope !== "ALL" ? await tx.riskMatrixConfig.findFirst({ where: { applicableModuleScope: scope, isActive: true } }) : null;
            if (scopeSpecific)
                return scopeSpecific;
            const fallback = await tx.riskMatrixConfig.findFirst({ where: { applicableModuleScope: "ALL", isActive: true } });
            if (!fallback) {
                throw new common_1.NotFoundException(`Tidak ada risk_matrix_configs aktif utk scope=${scope} maupun ALL — jalankan RiskMatrixBootstrapService.ensureDefaultMatrix() dulu.`);
            }
            return fallback;
        });
    }
    async getById(configId) {
        return this.prisma.withRls((tx) => tx.riskMatrixConfig.findUniqueOrThrow({ where: { id: configId }, include: { levels: true, cells: true } }));
    }
    async listVersions(scope) {
        return this.prisma.withRls((tx) => tx.riskMatrixConfig.findMany({ where: { applicableModuleScope: scope }, orderBy: { version: "desc" } }));
    }
};
exports.RiskMatrixConfigService = RiskMatrixConfigService;
exports.RiskMatrixConfigService = RiskMatrixConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RiskMatrixConfigService);
//# sourceMappingURL=risk-matrix-config.service.js.map