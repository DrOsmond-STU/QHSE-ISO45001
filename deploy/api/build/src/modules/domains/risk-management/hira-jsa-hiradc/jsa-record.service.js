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
exports.JsaRecordService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../../platform/numbering/numbering.service");
const workflow_engine_service_1 = require("../../../../platform/workflow-engine/workflow-engine.service");
const risk_matrix_context_1 = require("../matrix/risk-matrix-context");
const risk_workflow_bootstrap_service_1 = require("./risk-workflow-bootstrap.service");
const JSA_NUMBERING_MODULE_CODE = "JSA";
const JSA_WORKFLOW_ENTITY_TYPE = "jsa_record";
// Task 3.2 (Modul 05 §4.2/§5). BELUM ada controller HTTP — risk.jsa.* sudah
// di-seed RBAC baseline (task 114).
let JsaRecordService = class JsaRecordService {
    prisma;
    numberingService;
    workflowEngineService;
    bootstrapService;
    constructor(prisma, numberingService, workflowEngineService, bootstrapService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.workflowEngineService = workflowEngineService;
        this.bootstrapService = bootstrapService;
    }
    async create(input) {
        const createdBy = (0, risk_matrix_context_1.requireActorUserId)();
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        await this.bootstrapService.ensureJsaNumberingConfig();
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
        const jsaNumber = await this.numberingService.generateNext(JSA_NUMBERING_MODULE_CODE, { variables: { SITE_CODE: site.siteCode } });
        return this.prisma.withRls((tx) => tx.jsaRecord.create({
            data: {
                tenantId,
                jsaNumber,
                siteId: input.siteId,
                departmentId: input.departmentId,
                jobTitle: input.jobTitle,
                jobDescription: input.jobDescription,
                preparedBy: input.preparedBy,
                assessmentDate: input.assessmentDate,
                validUntil: input.validUntil,
                linkedHiraId: input.linkedHiraId,
                status: "DRAFT",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async addJobStep(jsaId, sequenceNo, stepDescription) {
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.jsaJobStep.create({ data: { tenantId, jsaId, sequenceNo, stepDescription } }));
    }
    async addStepHazard(jsaStepId, input) {
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        return this.prisma.withRls((tx) => tx.jsaStepHazard.create({
            data: {
                tenantId,
                jsaStepId,
                hazardId: input.hazardId,
                hazardDescriptionFreetext: input.hazardDescriptionFreetext,
                potentialRisk: input.potentialRisk,
                controlMeasures: input.controlMeasures,
                ppeRequired: (input.ppeRequired ?? []),
            },
        }));
    }
    async getById(jsaId) {
        return this.prisma.withRls((tx) => tx.jsaRecord.findUniqueOrThrow({
            where: { id: jsaId },
            include: { jobSteps: { include: { stepHazards: true }, orderBy: { sequenceNo: "asc" } }, crewAcknowledgements: true },
        }));
    }
    /**
     * PRD §4.2 poin 2 — submit memicu workflow_instances (module_code=RISK,
     * entity_type=jsa_record). jsa_records.status TETAP "DRAFT" sepanjang
     * proses (skema §5 literal TIDAK py status "sedang direview" terpisah,
     * lihat banner comment jsa-lifecycle.ts) — guard double-submit karena itu
     * pakai workflowInstanceId===null (bukan cek status), BUKAN
     * validateJsaRecordStatusTransition() (yang cuma menegakkan urutan 5
     * status literal, tidak cocok utk skenario "masih DRAFT tapi sudah
     * pernah/sedang disubmit").
     */
    async submitForApproval(jsaId) {
        await this.prisma.withRls(async (tx) => {
            const jsa = await tx.jsaRecord.findUniqueOrThrow({ where: { id: jsaId } });
            if (jsa.status !== "DRAFT") {
                throw new common_1.BadRequestException(`jsa_records berstatus ${jsa.status} tidak dapat diajukan (wajib DRAFT).`);
            }
            if (jsa.workflowInstanceId !== null) {
                throw new common_1.BadRequestException(`jsa_records ${jsaId} sudah memiliki workflow approval yang sedang berjalan.`);
            }
            const stepCount = await tx.jsaJobStep.count({ where: { jsaId } });
            if (stepCount === 0) {
                throw new common_1.BadRequestException(`jsa_records ${jsaId} belum memiliki jsa_job_steps — tidak dapat diajukan.`);
            }
        });
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureJsaWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(JSA_WORKFLOW_ENTITY_TYPE, jsaId, definition.id, {});
        return this.prisma.withRls((tx) => tx.jsaRecord.update({ where: { id: jsaId }, data: { workflowInstanceId: instance.id } }));
    }
    /**
     * PRD §4.2 poin 3 — sign-off kru sebelum bekerja tiap shift (ISO 45001
     * §5.4). Hanya JSA ACTIVE yang bisa diakui (BR-08-ADJACENT: kalau belum
     * ACTIVE, belum ada versi disetujui utk diikuti kru). Unique constraint
     * DB (jsaId,userId,workDate) menegakkan "1 per user per work_date" —
     * P2002 diterjemahkan pesan bersih via withCleanUniqueViolation().
     */
    async acknowledge(jsaId, userId, workDate, signatureRef) {
        const tenantId = (0, risk_matrix_context_1.requireTenantId)();
        return (0, risk_matrix_context_1.withCleanUniqueViolation)(() => this.prisma.withRls(async (tx) => {
            const jsa = await tx.jsaRecord.findUniqueOrThrow({ where: { id: jsaId } });
            if (jsa.status !== "ACTIVE") {
                throw new common_1.BadRequestException(`jsa_records berstatus ${jsa.status} belum dapat di-acknowledge (wajib ACTIVE).`);
            }
            return tx.jsaCrewAcknowledgement.create({
                data: { tenantId, jsaId, userId, workDate, acknowledgedAt: new Date(), signatureRef },
            });
        }), `Anda sudah mengakui (acknowledge) JSA ini utk tanggal kerja tersebut.`);
    }
};
exports.JsaRecordService = JsaRecordService;
exports.JsaRecordService = JsaRecordService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        workflow_engine_service_1.WorkflowEngineService,
        risk_workflow_bootstrap_service_1.RiskWorkflowBootstrapService])
], JsaRecordService);
