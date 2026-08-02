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
exports.ContractorWorkerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const contractor_context_1 = require("./contractor-context");
let ContractorWorkerService = class ContractorWorkerService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    // §4.3 poin 2 — pekerja didaftarkan. BR-03 ditegakkan BY CONSTRUCTION —
    // status TIDAK PERNAH diterima sbg input caller (beda field lain), SELALU
    // dihitung server-side dari siteInductionCompleted. PRD §5 enum
    // contractor_workers.status TIDAK PUNYA nilai "baru terdaftar/belum
    // diinduksi" (hanya ACTIVE/DEMOBILIZED/SUSPENDED/BLACKLISTED) — SUSPENDED
    // dipakai sbg placeholder pra-induksi terdekat (gap TDD §26, lihat banner
    // comment schema.prisma blok Modul 17 poin akhir).
    async register(input) {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractorWorker.create({
            data: {
                tenantId,
                contractorId: input.contractorId,
                projectAssignmentId: input.projectAssignmentId,
                fullName: input.fullName,
                idNumberKtp: input.idNumberKtp,
                dateOfBirth: input.dateOfBirth,
                jobPosition: input.jobPosition,
                workerCategory: input.workerCategory,
                isAuthorizedPermitRequester: input.isAuthorizedPermitRequester ?? false,
                siteInductionCompleted: false,
                status: "SUSPENDED",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    // §4.3 poin 3 — BR-03: site_induction_completed=TRUE adalah SATU-SATUNYA
    // jalur worker menjadi ACTIVE (mobilisasi penuh).
    async completeSiteInduction(id, inductionDate = new Date()) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractorWorker.update({
            where: { id },
            data: {
                siteInductionCompleted: true,
                siteInductionDate: inductionDate,
                status: "ACTIVE",
                mobilizationDate: new Date(),
                updatedBy: actorUserId,
            },
        }));
    }
    // §4.3 poin 5 — proyek selesai/dihentikan.
    async demobilize(id) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractorWorker.update({ where: { id }, data: { status: "DEMOBILIZED", demobilizationDate: new Date(), updatedBy: actorUserId } }));
    }
    async updateAuthorizedPermitRequester(id, isAuthorizedPermitRequester) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractorWorker.update({ where: { id }, data: { isAuthorizedPermitRequester, updatedBy: actorUserId } }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.contractorWorker.findUniqueOrThrow({ where: { id } }));
    }
    async listByAssignment(projectAssignmentId) {
        return this.prisma.withRls((tx) => tx.contractorWorker.findMany({ where: { projectAssignmentId, deletedAt: null } }));
    }
};
exports.ContractorWorkerService = ContractorWorkerService;
exports.ContractorWorkerService = ContractorWorkerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContractorWorkerService);
//# sourceMappingURL=contractor-worker.service.js.map