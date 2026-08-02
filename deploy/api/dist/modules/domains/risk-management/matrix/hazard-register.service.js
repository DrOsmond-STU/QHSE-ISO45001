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
exports.HazardRegisterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const risk_matrix_context_1 = require("./risk-matrix-context");
// Task 3.1/3.2 (Modul 05 §5/§6 BR-07). BELUM ada controller HTTP —
// risk.hazard.propose/manage sudah di-seed RBAC baseline (task 104).
// BR-07 ("tidak dapat dihapus permanen selama masih direferensikan
// hira_hazard_lines/jsa_step_hazards/hiradc_lines AKTIF") — TIDAK ADA
// method hard-delete di sini sama sekali (konvensi soft-delete universal
// codebase ini), jadi bagian "tidak dapat dihapus permanen" terpenuhi by
// construction. Bagian "validasi referensial" DITUTUP task 3.2 begitu
// ketiga tabel anak genuinely ada (gap TDD §26 #92, sekarang diselesaikan)
// — retire() di bawah cek KETIGA tabel, tanpa membedakan status parent
// (HIRA/JSA/HIRADC) — "aktif" literal PRD dibaca KONSERVATIF sbg "ada
// referensi APA PUN" (bukan dipersempit ke parent yang masih status
// tertentu), menghindari encode 3 aturan "status aktif" berbeda dari 3
// modul lain ke dalam satu leaf service — lebih baik terlalu hati-hati
// (block retire) drpd salah mengizinkan referensi yatim.
let HazardRegisterService = class HazardRegisterService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const createdBy = (0, risk_matrix_context_1.requireActorUserId)();
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.hazardRegister.create({
            data: {
                tenantId,
                siteId: input.siteId,
                hazardCode: input.hazardCode,
                hazardCategory: input.hazardCategory,
                hazardDescription: input.hazardDescription,
                potentialConsequence: input.potentialConsequence,
                status: "ACTIVE",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async update(hazardId, input) {
        const updatedBy = (0, risk_matrix_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.hazardRegister.update({
            where: { id: hazardId },
            data: { ...input, updatedBy },
        }));
    }
    async getById(hazardId) {
        return this.prisma.withRls((tx) => tx.hazardRegister.findUniqueOrThrow({ where: { id: hazardId } }));
    }
    /** siteId=undefined -> seluruh hazard tenant (generik + per-site); siteId
     * diisi -> generik (siteId NULL, PRD §5 "NULL = bahaya generik tenant-wide")
     * DITAMBAH yang spesifik site itu, pola sama DocumentService "NULL
     * berlaku lebih luas". */
    async listActive(siteId) {
        return this.prisma.withRls((tx) => tx.hazardRegister.findMany({
            where: {
                status: "ACTIVE",
                deletedAt: null,
                ...(siteId ? { OR: [{ siteId: null }, { siteId }] } : {}),
            },
            orderBy: { hazardDescription: "asc" },
        }));
    }
    /** Soft delete (deletedAt + status INACTIVE) — pola sama
     * IndustryTemplateService.deactivate() (1.2)/DocumentService.retire()
     * (2.1). BR-07 — cek referensial ke hira_hazard_lines/jsa_step_hazards/
     * hiradc_lines SEBELUM soft-delete, lihat banner comment kelas. */
    async retire(hazardId) {
        const updatedBy = (0, risk_matrix_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const [hiraCount, jsaCount, hiradcCount] = await Promise.all([
                tx.hiraHazardLine.count({ where: { hazardId } }),
                tx.jsaStepHazard.count({ where: { hazardId } }),
                tx.hiradcLine.count({ where: { hazardId } }),
            ]);
            if (hiraCount > 0 || jsaCount > 0 || hiradcCount > 0) {
                throw new common_1.ConflictException(`hazard_register ${hazardId} masih direferensikan (hira_hazard_lines=${hiraCount}, jsa_step_hazards=${jsaCount}, hiradc_lines=${hiradcCount}) — tidak dapat di-retire (BR-07).`);
            }
            return tx.hazardRegister.update({
                where: { id: hazardId },
                data: { status: "INACTIVE", deletedAt: new Date(), updatedBy },
            });
        });
    }
};
exports.HazardRegisterService = HazardRegisterService;
exports.HazardRegisterService = HazardRegisterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HazardRegisterService);
//# sourceMappingURL=hazard-register.service.js.map