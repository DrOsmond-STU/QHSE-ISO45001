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
exports.IsolationLotoRecordService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const work_permit_context_1 = require("./work-permit-context");
// Task 3.3 (Modul 06 §4 poin 6/§5/§6 BR-03). BELUM ada controller HTTP —
// work_permit.loto.record sudah di-seed RBAC baseline (task 129). Bukti
// foto isolasi via attachments generik (0.12, PRD §5 "entity_type=
// isolation_loto_record") — TIDAK ada method upload eksplisit di sini
// (caller pakai AttachmentService langsung, pola sama licenses_permits 2.2
// yang juga tidak wiring upload evidence generik), gap TDD §26.
let IsolationLotoRecordService = class IsolationLotoRecordService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async apply(input) {
        const createdBy = (0, work_permit_context_1.requireActorUserId)();
        const tenantId = (0, work_permit_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.isolationLotoRecord.create({
            data: {
                tenantId,
                workPermitId: input.workPermitId,
                isolationPointDescription: input.isolationPointDescription,
                isolationType: input.isolationType,
                lockNumber: input.lockNumber,
                tagNumber: input.tagNumber,
                appliedBy: input.appliedBy,
                appliedAt: input.appliedAt,
                status: "APPLIED",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    /** PRD §5 "Prinsip verifikasi independen (dua orang berbeda: pemasang vs
     * verifikator)" — verifiedBy WAJIB beda dari appliedBy, ditegakkan DI
     * SINI (bukan CHECK constraint DB — lihat banner comment schema.prisma
     * IsolationLotoRecord soal kenapa app-level guard dipilih drpd DB-level). */
    async verify(isolationLotoId, verifiedBy) {
        const updatedBy = (0, work_permit_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const record = await tx.isolationLotoRecord.findUniqueOrThrow({ where: { id: isolationLotoId } });
            if (record.appliedBy === verifiedBy) {
                throw new common_1.BadRequestException("Verifikator isolation_loto_records wajib berbeda dari petugas yang memasang (prinsip verifikasi independen).");
            }
            if (record.status !== "APPLIED") {
                throw new common_1.BadRequestException(`isolation_loto_records berstatus ${record.status} tidak dapat diverifikasi (wajib APPLIED).`);
            }
            return tx.isolationLotoRecord.update({
                where: { id: isolationLotoId },
                data: { status: "VERIFIED", verifiedBy, verifiedAt: new Date(), updatedBy },
            });
        });
    }
    async remove(isolationLotoId, removedBy) {
        const updatedBy = (0, work_permit_context_1.requireActorUserId)();
        return this.prisma.withRls(async (tx) => {
            const record = await tx.isolationLotoRecord.findUniqueOrThrow({ where: { id: isolationLotoId } });
            if (record.status !== "VERIFIED") {
                throw new common_1.BadRequestException(`isolation_loto_records berstatus ${record.status} tidak dapat dilepas (wajib VERIFIED).`);
            }
            return tx.isolationLotoRecord.update({
                where: { id: isolationLotoId },
                data: { status: "REMOVED", removedBy, removedAt: new Date(), updatedBy },
            });
        });
    }
    async listByPermit(workPermitId) {
        return this.prisma.withRls((tx) => tx.isolationLotoRecord.findMany({ where: { workPermitId }, orderBy: { appliedAt: "desc" } }));
    }
};
exports.IsolationLotoRecordService = IsolationLotoRecordService;
exports.IsolationLotoRecordService = IsolationLotoRecordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IsolationLotoRecordService);
//# sourceMappingURL=isolation-loto-record.service.js.map