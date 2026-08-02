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
exports.CapaRootCauseAnalysisService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const capa_context_1 = require("./capa-context");
const capa_register_service_1 = require("./capa-register.service");
// Task 4.2 (Modul 10 §4 poin 3, §3 "CAPA Owner/PIC | capa.root_cause.record").
// BELUM ada controller HTTP. record() SELALU boleh dipanggil ulang (BR-04
// siklus NOT_EFFECTIVE_REOPENED butuh root cause BARU, bukan update baris
// lama — "1..N capa_root_cause_analysis, umumnya 1, bisa >1 jika
// NOT_EFFECTIVE_REOPENED" PRD §5 ERD literal).
let CapaRootCauseAnalysisService = class CapaRootCauseAnalysisService {
    prisma;
    registerService;
    constructor(prisma, registerService) {
        this.prisma = prisma;
        this.registerService = registerService;
    }
    async record(input) {
        const analyzedBy = (0, capa_context_1.requireActorUserId)();
        const tenantId = (0, capa_context_1.requireTenantId)();
        await this.registerService.markRootCauseAnalysisStarted(input.capaRegisterId);
        return this.prisma.withRls((tx) => tx.capaRootCauseAnalysis.create({
            data: {
                tenantId,
                capaRegisterId: input.capaRegisterId,
                method: input.method,
                methodDetail: input.methodDetail,
                rootCauseSummary: input.rootCauseSummary,
                contributingFactors: input.contributingFactors,
                analyzedBy,
                analyzedAt: new Date(),
                createdBy: analyzedBy,
                updatedBy: analyzedBy,
            },
        }));
    }
    async getById(rootCauseAnalysisId) {
        return this.prisma.withRls((tx) => tx.capaRootCauseAnalysis.findUniqueOrThrow({ where: { id: rootCauseAnalysisId } }));
    }
    async listByCapa(capaRegisterId) {
        return this.prisma.withRls((tx) => tx.capaRootCauseAnalysis.findMany({ where: { capaRegisterId, deletedAt: null }, orderBy: { analyzedAt: "desc" } }));
    }
};
exports.CapaRootCauseAnalysisService = CapaRootCauseAnalysisService;
exports.CapaRootCauseAnalysisService = CapaRootCauseAnalysisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        capa_register_service_1.CapaRegisterService])
], CapaRootCauseAnalysisService);
