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
exports.ContractorProjectAssignmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const contractor_workflow_bootstrap_service_1 = require("./contractor-workflow-bootstrap.service");
const contractor_context_1 = require("./contractor-context");
const contractor_lifecycle_1 = require("./contractor-lifecycle");
const ASSIGNMENT_NUMBERING_MODULE_CODE = "CONTRACTOR_ASSIGNMENT";
let ContractorProjectAssignmentService = class ContractorProjectAssignmentService {
    prisma;
    numbering;
    workflowBootstrap;
    constructor(prisma, numbering, workflowBootstrap) {
        this.prisma = prisma;
        this.numbering = numbering;
        this.workflowBootstrap = workflowBootstrap;
    }
    // §4.3 poin 1 — BR-01 kontraktor HANYA dapat ditugaskan jika
    // status=PREQUALIFIED atau ACTIVE.
    async create(input) {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        const contractor = await this.prisma.withRls((tx) => tx.contractor.findUniqueOrThrow({ where: { id: input.contractorId } }));
        if (!(0, contractor_lifecycle_1.isContractorEligibleForAssignment)(contractor.status)) {
            throw new common_1.BadRequestException(`BR-01 — contractor_project_assignments tidak dapat dibuat: contractors.status="${contractor.status}" (harus PREQUALIFIED atau ACTIVE).`);
        }
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { companyId: true, siteCode: true } }));
        let contractNo = input.contractNo;
        if (input.autoGenerateContractNo) {
            await this.workflowBootstrap.ensureAssignmentNumberingConfig(input.siteId);
            contractNo = await this.numbering.generateNext(ASSIGNMENT_NUMBERING_MODULE_CODE, { scopeId: input.siteId, variables: { SITE_CODE: site.siteCode } });
        }
        return this.prisma.withRls((tx) => tx.contractorProjectAssignment.create({
            data: {
                tenantId,
                contractorId: input.contractorId,
                companyId: site.companyId,
                branchId: input.branchId,
                siteId: input.siteId,
                contractNo,
                contractTitle: input.contractTitle,
                scopeOfWork: input.scopeOfWork,
                contractStartDate: input.contractStartDate,
                contractEndDate: input.contractEndDate,
                contractValue: input.contractValue,
                hsePlanDocumentId: input.hsePlanDocumentId,
                picInternalUserId: input.picInternalUserId,
                riskClassification: input.riskClassification,
                status: "PLANNED",
                createdBy: actorUserId,
                updatedBy: actorUserId,
            },
        }));
    }
    // §4.3 poin 1 (transisi ke ACTIVE) — BR-04 utk tenant OIL_GAS wajib
    // IUJP+CSMS_CERTIFICATE compliance docs is_mandatory_for_ptk007=true
    // SEBELUM assignment ACTIVE.
    async activate(id) {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        const assignment = await this.prisma.withRls((tx) => tx.contractorProjectAssignment.findUniqueOrThrow({ where: { id } }));
        const tenant = await this.prisma.withRls((tx) => tx.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { industryTemplate: { select: { code: true } } } }));
        const isOilGasTenant = tenant.industryTemplate?.code === "OIL_GAS";
        const complianceDocs = await this.prisma.withRls((tx) => tx.contractorDocumentCompliance.findMany({
            where: { contractorId: assignment.contractorId },
            select: { documentCategory: true, isMandatoryForPtk007: true },
        }));
        if (!(0, contractor_lifecycle_1.isPtk007ComplianceSatisfied)(isOilGasTenant, complianceDocs.map((d) => ({ category: d.documentCategory, isMandatoryForPtk007: d.isMandatoryForPtk007 })))) {
            throw new common_1.BadRequestException("BR-04 — assignment tidak dapat ACTIVE: tenant sektor Migas wajib dokumen IUJP dan CSMS_CERTIFICATE (is_mandatory_for_ptk007=true) pada contractor_document_compliance.");
        }
        return this.prisma.withRls((tx) => tx.contractorProjectAssignment.update({ where: { id }, data: { status: "ACTIVE", updatedBy: actorUserId } }));
    }
    async updateStatus(id, status) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractorProjectAssignment.update({ where: { id }, data: { status, updatedBy: actorUserId } }));
    }
    // §4.3 poin 5 — perwakilan kontraktor di lapangan ditautkan SETELAH
    // pekerja terdaftar (bidirectional FK dgn contractor_workers, keduanya
    // nullable — urutan create WAJIB assignment dulu baru worker, lihat
    // banner comment schema.prisma blok Modul 17).
    async setContractorPic(id, contractorPicWorkerId) {
        const actorUserId = (0, contractor_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.contractorProjectAssignment.update({ where: { id }, data: { contractorPicWorkerId, updatedBy: actorUserId } }));
    }
    async getById(id) {
        return this.prisma.withRls((tx) => tx.contractorProjectAssignment.findUniqueOrThrow({ where: { id } }));
    }
};
exports.ContractorProjectAssignmentService = ContractorProjectAssignmentService;
exports.ContractorProjectAssignmentService = ContractorProjectAssignmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        contractor_workflow_bootstrap_service_1.ContractorWorkflowBootstrapService])
], ContractorProjectAssignmentService);
