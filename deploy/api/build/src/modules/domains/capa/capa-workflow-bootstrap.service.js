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
exports.CapaWorkflowBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const capa_context_1 = require("./capa-context");
// PRD §10 — module_code=CAPA, dipakai capa_register.capa_number.
const CAPA_NUMBERING_MODULE_CODE = "CAPA";
const CAPA_NUMBERING_PATTERN = "CAPA/{SITE_CODE}/{YYYY}/{SEQ:4}";
const CAPA_NUMBERING_PREFIX = "CAPA";
// PRD §4 tabel "Konfigurasi Workflow Engine default" py 3 BARIS (Root
// Cause Review/Action Plan Approval/Effectiveness Verification Approval)
// TAPI Stage 1 "Root Cause Review" literal "Opsional per tenant" TANPA
// kolom konfigurasi apa pun di skema §5 utk mengaktifkannya — TIDAK
// diimplementasikan sbg workflow_definitions sungguhan, pola SAMA
// Inspection 3.6 (review opsional yang juga tidak diimplementasikan krn
// alasan identik: PRD bilang opsional tapi tidak beri tempat konfigurasi).
// KEDUA workflow DI BAWAH masing2 SATU STAGE saja (BEDA dari Audit 4.1
// yang 2-stage) — PRD §4 literal HANYA beri 1 baris config utk masing2.
const CAPA_ACTION_PLAN_MODULE_CODE = "CAPA_ACTION_PLAN";
const CAPA_EFFECTIVENESS_VERIFICATION_MODULE_CODE = "CAPA_EFFECTIVENESS_VERIFICATION";
const CAPA_ACTION_PLAN_WORKFLOW_NAME = "CAPA Action Plan Approval — 1 Stage (HSE/QMS Manager)";
const CAPA_EFFECTIVENESS_VERIFICATION_WORKFLOW_NAME = "CAPA Effectiveness Verification Approval — 1 Stage (HSE/QMS Manager)";
// PRD §4 "3 hari kerja" (action plan) / "5 hari kerja" (effectiveness
// verification) — TIDAK ada integrasi business-day calendar ke slaHours
// (gap TDD §26 konsisten seluruh modul lain sejak 1.1) — didekati flat
// N x 24 jam kalender.
const CAPA_ACTION_PLAN_STAGE_SLA_HOURS = 72;
const CAPA_EFFECTIVENESS_VERIFICATION_STAGE_SLA_HOURS = 120;
/**
 * Task 4.2 — pola PERSIS RegulatoryComplianceBootstrapService (2.2, plain
 * 1-stage TANPA JSON Logic condition) x2 (capa_action_plan DAN
 * capa_effectiveness_verification), digabung SATU service krn keduanya
 * milik modul yang sama. BR-06 (CAPA priority=CRITICAL wajib approval HSE
 * Manager, tidak boleh auto-approve) TERPENUHI BY CONSTRUCTION — approver
 * SELALU ROLE_IN_SCOPE HSE_MANAGER apa pun priority-nya (TIDAK ADA
 * mekanisme "auto-approve"/template ringan per-priority di Workflow
 * Engine 0.9 manapun di codebase ini), jadi tidak butuh JSON Logic
 * condition tambahan.
 */
let CapaWorkflowBootstrapService = class CapaWorkflowBootstrapService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureNumberingConfig(siteId) {
        const tenantId = (0, capa_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.numberingConfig.findFirst({
                where: { tenantId, moduleCode: CAPA_NUMBERING_MODULE_CODE, scopeId: siteId },
            });
            if (existing)
                return existing;
            return tx.numberingConfig.create({
                data: {
                    tenantId,
                    moduleCode: CAPA_NUMBERING_MODULE_CODE,
                    pattern: CAPA_NUMBERING_PATTERN,
                    prefix: CAPA_NUMBERING_PREFIX,
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
            throw new common_1.NotFoundException(`Role sistem "${roleCode}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul CAPA bisa membuat workflow_definitions default.`);
        }
        return role;
    }
    async ensureActionPlanWorkflowDefinition(tx) {
        return this.ensureSingleStageDefinition(tx, CAPA_ACTION_PLAN_MODULE_CODE, CAPA_ACTION_PLAN_WORKFLOW_NAME, "Action Plan Approval", CAPA_ACTION_PLAN_STAGE_SLA_HOURS);
    }
    async ensureEffectivenessVerificationWorkflowDefinition(tx) {
        return this.ensureSingleStageDefinition(tx, CAPA_EFFECTIVENESS_VERIFICATION_MODULE_CODE, CAPA_EFFECTIVENESS_VERIFICATION_WORKFLOW_NAME, "Effectiveness Verification Approval", CAPA_EFFECTIVENESS_VERIFICATION_STAGE_SLA_HOURS);
    }
    async ensureSingleStageDefinition(tx, moduleCode, name, stageName, slaHours) {
        const tenantId = (0, capa_context_1.requireTenantId)();
        const existing = await tx.workflowDefinition.findFirst({
            where: { tenantId, moduleCode, isActive: true },
            orderBy: { version: "desc" },
        });
        if (existing)
            return existing;
        const hseManagerRole = await this.findRoleOrThrow(tx, "HSE_MANAGER");
        const definition = await tx.workflowDefinition.create({
            data: { tenantId, moduleCode, name, isActive: true, version: 1 },
        });
        const stage1 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 1,
                stageName,
                approverType: "ROLE_IN_SCOPE",
                approverRoleId: hseManagerRole.id,
                slaHours,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        await tx.workflowTransition.createMany({
            data: [
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED" },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED" },
            ],
        });
        return definition;
    }
};
exports.CapaWorkflowBootstrapService = CapaWorkflowBootstrapService;
exports.CapaWorkflowBootstrapService = CapaWorkflowBootstrapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CapaWorkflowBootstrapService);
