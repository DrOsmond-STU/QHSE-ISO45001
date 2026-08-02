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
exports.ContractorService = void 0;
const common_1 = require("@nestjs/common");
const audit_log_service_1 = require("../../../platform/audit-log/audit-log.service");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const contractor_context_1 = require("./contractor-context");
const contractor_lifecycle_1 = require("./contractor-lifecycle");
let ContractorService = class ContractorService {
    prisma;
    auditLogService;
    constructor(prisma, auditLogService) {
        this.prisma = prisma;
        this.auditLogService = auditLogService;
    }
    // §4.1 poin 1 — registrasi awal, status default REGISTERED.
    async create(input) {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractor.create({
            data: {
                tenantId,
                contractorName: input.contractorName,
                contractorType: input.contractorType,
                businessRegistrationNo: input.businessRegistrationNo,
                businessLicenseType: input.businessLicenseType,
                taxIdNpwp: input.taxIdNpwp,
                address: input.address,
                city: input.city,
                province: input.province,
                contactPersonName: input.contactPersonName,
                contactPersonPhone: input.contactPersonPhone,
                contactPersonEmail: input.contactPersonEmail,
                contractorCategory: input.contractorCategory,
                parentContractorId: input.parentContractorId,
                overallRiskRating: input.overallRiskRating,
                status: "REGISTERED",
                registeredAt: new Date(),
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    async update(id, input) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractor.update({
            where: { id },
            data: { ...input, updatedBy: actorUserId },
        }));
    }
    // BR-06 — perubahan status MENJADI BLACKLISTED wajib approval HSE Manager
    // (ditegakkan CALLER via RBAC contractor.status.blacklist_approve, HANYA
    // role itu yang bisa memanggil path override) + alasan WAJIB diisi,
    // dicatat system_audit_logs — pola PERSIS BR-05 Calibration 6.2
    // (AuditLogService.recordStandalone(), bukan Workflow Engine terpisah,
    // PRD §6 tidak minta workflow formal utk transisi status ini).
    async updateStatus(id, newStatus, justification) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        if ((0, contractor_lifecycle_1.isBlacklistTransition)(newStatus)) {
            if (!justification) {
                throw new common_1.BadRequestException("BR-06 — perubahan status ke BLACKLISTED wajib menyertakan alasan (justifikasi).");
            }
            await this.auditLogService.recordStandalone({
                action: "BLACKLIST",
                entityType: "contractor",
                entityId: id,
                afterValue: { justification },
            });
        }
        return this.prisma.withRls((tx) => tx.contractor.update({ where: { id }, data: { status: newStatus, updatedBy: actorUserId } }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.contractor.findUniqueOrThrow({ where: { id } }));
    }
    async list() {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.contractor.findMany({ where: { tenantId, deletedAt: null }, orderBy: { contractorName: "asc" } }));
    }
};
exports.ContractorService = ContractorService;
exports.ContractorService = ContractorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_log_service_1.AuditLogService])
], ContractorService);
//# sourceMappingURL=contractor.service.js.map