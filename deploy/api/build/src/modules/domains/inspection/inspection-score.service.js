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
exports.InspectionScoreService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const inspection_context_1 = require("./inspection-context");
// PRD §5 "inspection_scores — ringkasan skor per kategori dalam 1
// inspeksi, BEDA dari overall_score." Caller (mis. UI/report generator)
// menghitung breakdown per category dari inspection_record_items sendiri
// lalu memanggil record() per kategori — TIDAK diotomatisasi di
// InspectionRecordService.complete() (PRD tidak menyebutnya sbg bagian
// BR-03, hanya overall_score yang eksplisit "dihitung otomatis").
let InspectionScoreService = class InspectionScoreService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async record(input) {
        const createdBy = (0, inspection_context_1.requireActorUserId)();
        const tenantId = (0, inspection_context_1.requireTenantId)();
        const percentage = input.maxPossibleScore === 0 ? 0 : (input.scoreObtained / input.maxPossibleScore) * 100;
        return this.prisma.withRls((tx) => tx.inspectionScore.create({
            data: {
                tenantId,
                inspectionRecordId: input.inspectionRecordId,
                category: input.category,
                scoreObtained: input.scoreObtained,
                maxPossibleScore: input.maxPossibleScore,
                percentage,
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async listByRecord(inspectionRecordId) {
        return this.prisma.withRls((tx) => tx.inspectionScore.findMany({ where: { inspectionRecordId }, orderBy: { category: "asc" } }));
    }
};
exports.InspectionScoreService = InspectionScoreService;
exports.InspectionScoreService = InspectionScoreService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InspectionScoreService);
