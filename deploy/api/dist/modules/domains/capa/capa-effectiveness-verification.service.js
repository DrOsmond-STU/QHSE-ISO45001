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
exports.CapaEffectivenessVerificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const workflow_engine_service_1 = require("../../../platform/workflow-engine/workflow-engine.service");
const capa_context_1 = require("./capa-context");
const capa_action_plan_rules_1 = require("./capa-action-plan-rules");
const capa_effectiveness_rules_1 = require("./capa-effectiveness-rules");
const capa_register_lifecycle_1 = require("./capa-register-lifecycle");
const capa_workflow_bootstrap_service_1 = require("./capa-workflow-bootstrap.service");
const capa_approval_cache_service_1 = require("./capa-approval-cache.service");
// entity_type=capa_effectiveness_verification — BEDA dari capa_action_plan
// (lihat banner comment CapaActionPlanService): entityId DI SINI adalah
// baris capa_effectiveness_verification itu SENDIRI (bukan capa_register.id)
// krn SATU siklus verifikasi = TEPAT SATU baris (beda dari action plan yang
// bisa >1 baris per submission) — pola konsisten precedent lain (entity_type
// namai baris tunggal target langsung).
const CAPA_EFFECTIVENESS_VERIFICATION_WORKFLOW_ENTITY_TYPE = "capa_effectiveness_verification";
/**
 * Task 4.2 (Modul 10 §4 poin 7-9, §3 "Effectiveness Verifier | capa.effectiveness.verify").
 * BELUM ada controller HTTP. create() menjadwalkan/menugaskan verifikasi
 * (BR-02+BR-03 gate SEBELUM capa_register.status->PENDING_EFFECTIVENESS_VERIFICATION);
 * recordResult() dipanggil TERPISAH begitu Verifier genuinely
 * menyelesaikan observasi (bisa berhari-hari/berbulan setelah create(),
 * PRD §4 poin 7 "observation_period_days... 30-90 hari" — BUKAN transaksi
 * yang sama).
 */
let CapaEffectivenessVerificationService = class CapaEffectivenessVerificationService {
    prisma;
    bootstrapService;
    workflowEngineService;
    approvalCacheService;
    constructor(prisma, bootstrapService, workflowEngineService, approvalCacheService) {
        this.prisma = prisma;
        this.bootstrapService = bootstrapService;
        this.workflowEngineService = workflowEngineService;
        this.approvalCacheService = approvalCacheService;
    }
    async create(input) {
        const createdBy = (0, capa_context_1.requireActorUserId)();
        const tenantId = (0, capa_context_1.requireTenantId)();
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: input.capaRegisterId }, include: { actionPlans: true } }));
        (0, capa_register_lifecycle_1.validateCapaRegisterStatusTransition)(capa.status, "PENDING_EFFECTIVENESS_VERIFICATION");
        (0, capa_action_plan_rules_1.assertAllActionPlansCompleted)(capa.actionPlans.map((p) => ({ statusCache: p.statusCache })));
        (0, capa_effectiveness_rules_1.assertVerifierNotPic)(input.verifiedBy, capa.actionPlans.map((p) => p.picUserId));
        await this.prisma.withRls((tx) => tx.capaRegister.update({
            where: { id: input.capaRegisterId },
            data: { status: "PENDING_EFFECTIVENESS_VERIFICATION", updatedBy: createdBy },
        }));
        return this.prisma.withRls((tx) => tx.capaEffectivenessVerification.create({
            data: {
                tenantId,
                capaRegisterId: input.capaRegisterId,
                verificationMethod: input.verificationMethod,
                observationPeriodDays: input.observationPeriodDays,
                verificationDueDate: input.verificationDueDate,
                verifiedBy: input.verifiedBy,
                result: "PENDING",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    async recordResult(effectivenessVerificationId, input) {
        const updatedBy = (0, capa_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.capaEffectivenessVerification.update({
            where: { id: effectivenessVerificationId },
            data: {
                result: input.result,
                evidenceDescription: input.evidenceDescription,
                notes: input.notes,
                verifiedAt: new Date(),
                updatedBy,
            },
        }));
    }
    async submitForApproval(effectivenessVerificationId) {
        const actorId = (0, capa_context_1.requireActorUserId)();
        const verification = await this.prisma.withRls((tx) => tx.capaEffectivenessVerification.findUniqueOrThrow({ where: { id: effectivenessVerificationId } }));
        if (verification.result === "PENDING") {
            throw new Error("capa_effectiveness_verification belum py result (EFFECTIVE/NOT_EFFECTIVE) — recordResult() dulu sebelum submit approval.");
        }
        const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: verification.capaRegisterId } }));
        if (capa.workflowInstanceId) {
            throw new Error("capa_register sudah punya workflow_instance aktif — tunggu hasil approval sebelum submit ulang.");
        }
        const definition = await this.prisma.withRls((tx) => this.bootstrapService.ensureEffectivenessVerificationWorkflowDefinition(tx));
        const instance = await this.workflowEngineService.startInstance(CAPA_EFFECTIVENESS_VERIFICATION_WORKFLOW_ENTITY_TYPE, effectivenessVerificationId, definition.id, {});
        await this.prisma.withRls((tx) => tx.capaRegister.update({ where: { id: verification.capaRegisterId }, data: { workflowInstanceId: instance.id, updatedBy: actorId } }));
        await this.approvalCacheService.refresh(verification.capaRegisterId, instance.id, "Effectiveness Verification Approval");
        return verification;
    }
    async getById(effectivenessVerificationId) {
        return this.prisma.withRls((tx) => tx.capaEffectivenessVerification.findUniqueOrThrow({ where: { id: effectivenessVerificationId } }));
    }
    async listByCapa(capaRegisterId) {
        return this.prisma.withRls((tx) => tx.capaEffectivenessVerification.findMany({ where: { capaRegisterId, deletedAt: null }, orderBy: { verificationDueDate: "desc" } }));
    }
};
exports.CapaEffectivenessVerificationService = CapaEffectivenessVerificationService;
exports.CapaEffectivenessVerificationService = CapaEffectivenessVerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        capa_workflow_bootstrap_service_1.CapaWorkflowBootstrapService,
        workflow_engine_service_1.WorkflowEngineService,
        capa_approval_cache_service_1.CapaApprovalCacheService])
], CapaEffectivenessVerificationService);
//# sourceMappingURL=capa-effectiveness-verification.service.js.map