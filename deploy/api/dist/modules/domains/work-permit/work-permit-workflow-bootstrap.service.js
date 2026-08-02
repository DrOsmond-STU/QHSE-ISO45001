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
exports.WorkPermitWorkflowBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const work_permit_context_1 = require("./work-permit-context");
const WORK_PERMIT_MODULE_CODE = "WORK_PERMIT";
const ISSUER_STAGE_SLA_HOURS = 2;
const HSE_STAGE_SLA_HOURS = 4;
const WORK_PERMIT_NUMBERING_PATTERN = "{PREFIX}/{SITE_CODE}/{YYYY}/{SEQ:4}";
const WORK_PERMIT_WORKFLOW_NAME = "Work Permit — 1/2 Level (Review Issuer/Area Authority -> [kondisional] Approval HSE)";
const WORK_PERMIT_EXTENSION_WORKFLOW_NAME = "Work Permit Extension — 1/2 Level (Review Issuer/Area Authority -> [kondisional] Approval HSE retest gas)";
// Task 3.3 — pola PERSIS RiskWorkflowBootstrapService (3.2): numbering_configs
// (0.10) DAN workflow_definitions+stages+transitions (0.9) di-lazy-create
// idempotent saat pertama dibutuhkan, BUKAN disentuh ProvisioningService
// (1.5) — gap konsisten sejak 2.1.
let WorkPermitWorkflowBootstrapService = class WorkPermitWorkflowBootstrapService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * PRD §5 "Numbering" literal: "module_code=WORK_PERMIT, pattern default
     * WP/{SITE_CODE}/{YYYY}/{SEQ:4}, reset_period=YEARLY, scope_level=SITE."
     * scope_level=SITE (BEDA dari HIRA/JSA/HIRADC/RISK_CORP scope_level=TENANT,
     * task 3.2) berarti SATU baris numbering_configs PER SITE — counter
     * genuinely terpisah antar site (bukan cuma token kosmetik {SITE_CODE}
     * lewat `variables`, lihat banner comment NumberingService.generateNext()
     * `GenerateNextOptions.scopeId`), mengurangi lock contention row-lock
     * saat lonjakan submit bersamaan mulai shift PER SITE (PRD §11).
     */
    async ensureNumberingConfig(siteId) {
        const tenantId = (0, work_permit_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode: WORK_PERMIT_MODULE_CODE, scopeId: siteId } });
            if (existing)
                return existing;
            return tx.numberingConfig.create({
                data: {
                    tenantId,
                    moduleCode: WORK_PERMIT_MODULE_CODE,
                    pattern: WORK_PERMIT_NUMBERING_PATTERN,
                    prefix: "WP",
                    resetPeriod: "YEARLY",
                    scopeLevel: "SITE",
                    scopeId: siteId,
                },
            });
        });
    }
    async findRoleOrThrow(tx, roleCode) {
        const role = await tx.role.findFirst({ where: { tenantId: null, roleCode } });
        if (!role) {
            throw new common_1.NotFoundException(`Role sistem "${roleCode}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Work Permit bisa membuat workflow_definitions default.`);
        }
        return role;
    }
    /**
     * PRD §4 poin 4-6 + tabel "Konfigurasi Workflow Engine default" — Stage 1
     * Review Issuer/Area Authority (`SUPERVISOR`, SELALU, SLA 2 jam) ->
     * [kondisional BR-04] Stage 2 Approval HSE (`HSE_MANAGER`, HANYA kalau
     * risk_level=HIGH ATAU work_permit_types.requires_hse_approval, SLA 4
     * jam). KONSUMEN KEDUA JSON Logic condition pada workflow_transitions di
     * seluruh codebase (setelah HIRA, task 3.2) — pola IDENTIK: DUA baris dari
     * stage1 dgn triggerAction=APPROVE sama tapi condition+priority beda;
     * priority 0 mengecek contextData.hasHseStage===true -> lanjut stage2;
     * priority 1 fallback (condition=null) -> langsung terminal APPROVED.
     * contextData.hasHseStage diisi WorkPermitService.submitForApproval()
     * SEBELUM startInstance() (computeHasHseStage(), work-permit-hse-stage-rules.ts)
     * — WorkflowEngineService sendiri TIDAK PERNAH fetch data domain.
     */
    async ensureWorkflowDefinition(tx) {
        const tenantId = (0, work_permit_context_1.requireTenantId)();
        const existing = await tx.workflowDefinition.findFirst({
            where: { tenantId, moduleCode: WORK_PERMIT_MODULE_CODE, name: WORK_PERMIT_WORKFLOW_NAME, isActive: true },
            orderBy: { version: "desc" },
        });
        if (existing)
            return existing;
        const supervisorRole = await this.findRoleOrThrow(tx, "SUPERVISOR");
        const hseManagerRole = await this.findRoleOrThrow(tx, "HSE_MANAGER");
        const definition = await tx.workflowDefinition.create({
            data: { tenantId, moduleCode: WORK_PERMIT_MODULE_CODE, name: WORK_PERMIT_WORKFLOW_NAME, isActive: true, version: 1 },
        });
        const stage1 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 1,
                stageName: "Review Issuer/Area Authority",
                approverType: "ROLE_IN_SCOPE",
                approverRoleId: supervisorRole.id,
                slaHours: ISSUER_STAGE_SLA_HOURS,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        const stage2 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 2,
                stageName: "Approval HSE (risiko HIGH/tipe wajib HSE)",
                approverType: "ROLE_IN_SCOPE",
                approverRoleId: hseManagerRole.id,
                slaHours: HSE_STAGE_SLA_HOURS,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        await tx.workflowTransition.createMany({
            data: [
                {
                    tenantId,
                    workflowDefinitionId: definition.id,
                    fromStageId: stage1.id,
                    toStageId: stage2.id,
                    triggerAction: "APPROVE",
                    condition: { "==": [{ var: "hasHseStage" }, true] },
                    priority: 0,
                },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED", priority: 1 },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED", priority: 0 },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage2.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED", priority: 0 },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage2.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED", priority: 0 },
            ],
        });
        return definition;
    }
    /**
     * PRD §4 poin 8 — "Extension... disetujui ulang oleh Issuer (dan HSE
     * jika tipe mengharuskan retest gas)." workflow_instance_id
     * (entity_type=work_permit_extension, PRD §5 literal) — KETIGA kalinya
     * JSON Logic condition dipakai pada workflow_transitions di seluruh
     * codebase (setelah HIRA 3.2, Work Permit Stage 2 HSE 3.3) — pola
     * IDENTIK, condition kali ini `gasRetestRequired` (field PADA
     * work_permit_extensions itu sendiri, diisi WorkPermitExtensionService.request()
     * dari input caller, BUKAN turunan risk_level/requires_hse_approval spt
     * permit induknya).
     */
    async ensureExtensionWorkflowDefinition(tx) {
        const tenantId = (0, work_permit_context_1.requireTenantId)();
        const existing = await tx.workflowDefinition.findFirst({
            where: { tenantId, moduleCode: WORK_PERMIT_MODULE_CODE, name: WORK_PERMIT_EXTENSION_WORKFLOW_NAME, isActive: true },
            orderBy: { version: "desc" },
        });
        if (existing)
            return existing;
        const supervisorRole = await this.findRoleOrThrow(tx, "SUPERVISOR");
        const hseManagerRole = await this.findRoleOrThrow(tx, "HSE_MANAGER");
        const definition = await tx.workflowDefinition.create({
            data: { tenantId, moduleCode: WORK_PERMIT_MODULE_CODE, name: WORK_PERMIT_EXTENSION_WORKFLOW_NAME, isActive: true, version: 1 },
        });
        const stage1 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 1,
                stageName: "Review Issuer/Area Authority (Extension)",
                approverType: "ROLE_IN_SCOPE",
                approverRoleId: supervisorRole.id,
                slaHours: ISSUER_STAGE_SLA_HOURS,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        const stage2 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 2,
                stageName: "Approval HSE (Extension — retest gas diperlukan)",
                approverType: "ROLE_IN_SCOPE",
                approverRoleId: hseManagerRole.id,
                slaHours: HSE_STAGE_SLA_HOURS,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        await tx.workflowTransition.createMany({
            data: [
                {
                    tenantId,
                    workflowDefinitionId: definition.id,
                    fromStageId: stage1.id,
                    toStageId: stage2.id,
                    triggerAction: "APPROVE",
                    condition: { "==": [{ var: "gasRetestRequired" }, true] },
                    priority: 0,
                },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED", priority: 1 },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED", priority: 0 },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage2.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED", priority: 0 },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage2.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED", priority: 0 },
            ],
        });
        return definition;
    }
};
exports.WorkPermitWorkflowBootstrapService = WorkPermitWorkflowBootstrapService;
exports.WorkPermitWorkflowBootstrapService = WorkPermitWorkflowBootstrapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkPermitWorkflowBootstrapService);
//# sourceMappingURL=work-permit-workflow-bootstrap.service.js.map