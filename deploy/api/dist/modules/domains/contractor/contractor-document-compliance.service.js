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
exports.ContractorDocumentComplianceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const contractor_context_1 = require("./contractor-context");
const contractor_lifecycle_1 = require("./contractor-lifecycle");
let ContractorDocumentComplianceService = class ContractorDocumentComplianceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    // §4.2 poin 1 — dokumen wajib berkelanjutan dicatat dgn expiry_date.
    // status dihitung SAAT create() (bukan hanya via scan) — kalau
    // expiryDate SUDAH lewat di titik pendaftaran (data migrasi/entri
    // terlambat), status langsung EXPIRED, bukan menunggu scan job harian
    // berikutnya.
    async register(input) {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        const status = (0, contractor_lifecycle_1.isComplianceExpired)(input.expiryDate, new Date()) ? "EXPIRED" : "VALID";
        return this.prisma.withRls((tx) => tx.contractorDocumentCompliance.create({
            data: {
                tenantId,
                contractorId: input.contractorId,
                documentCategory: input.documentCategory,
                documentId: input.documentId,
                documentNumber: input.documentNumber,
                issuedBy: input.issuedBy,
                issueDate: input.issueDate,
                expiryDate: input.expiryDate,
                reminderDaysBefore: input.reminderDaysBefore ?? 30,
                isMandatoryForPtk007: input.isMandatoryForPtk007 ?? false,
                status,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    // §4.2 poin 1 (RENEWAL_IN_PROGRESS) — Contractor Coordinator menandai
    // proses perpanjangan sedang berjalan (PRD §5 sediakan nilai enum ini
    // TANPA prosa §4.2 menjelaskan transisi kapan — dibaca sbg override
    // manual sebelum expiryDate baru genuinely tersedia, gap TDD §26).
    async markRenewalInProgress(id) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractorDocumentCompliance.update({ where: { id }, data: { status: "RENEWAL_IN_PROGRESS", updatedBy: actorUserId } }));
    }
    // Dipanggil setelah renewal selesai — expiry_date baru + reset idempotency
    // kolom reminder (BERPUTAR ULANG, pola sama Calibration/Asset — kolom
    // reminderSentAt/expiredNotifiedAt WAJIB null lagi utk siklus berikutnya).
    async renew(id, newExpiryDate) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractorDocumentCompliance.update({
            where: { id },
            data: {
                expiryDate: newExpiryDate,
                status: "VALID",
                reminderSentAt: null,
                expiredNotifiedAt: null,
                updatedBy: actorUserId,
            },
        }));
    }
    // BR-02 — dipanggil WorkPermitService sebelum create/submit permit dgn
    // contractorCompanyId terisi.
    async hasBlockingExpiredCompliance(contractorId) {
        const records = await this.prisma.withRls((tx) => tx.contractorDocumentCompliance.findMany({ where: { contractorId, deletedAt: null }, select: { status: true } }));
        return (0, contractor_lifecycle_1.hasBlockingExpiredCompliance)(records.map((r) => r.status));
    }
    async listByContractor(contractorId) {
        return this.prisma.withRls((tx) => tx.contractorDocumentCompliance.findMany({ where: { contractorId, deletedAt: null } }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.contractorDocumentCompliance.findUniqueOrThrow({ where: { id } }));
    }
};
exports.ContractorDocumentComplianceService = ContractorDocumentComplianceService;
exports.ContractorDocumentComplianceService = ContractorDocumentComplianceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContractorDocumentComplianceService);
//# sourceMappingURL=contractor-document-compliance.service.js.map