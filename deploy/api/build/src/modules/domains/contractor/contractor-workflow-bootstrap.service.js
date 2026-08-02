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
exports.ContractorWorkflowBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const contractor_context_1 = require("./contractor-context");
// PRD §5/§10 — 2 numbering_configs module_code TERPISAH. `CONTRACTOR_PQ`
// literal pattern PRD "PQ/{COMPANY_CODE}/{YYYY}/{SEQ:4}" TIDAK BISA diikuti
// apa adanya — `contractor_prequalification` (dan `contractors` induknya)
// TIDAK PUNYA kolom company_id SAMA SEKALI di skema §5 literal (hanya
// tenant_id; company_id/site_id BARU muncul di `contractor_project_assignments`,
// tabel LAIN yang independen dari prequalification) — token {COMPANY_CODE}
// TIDAK PERNAH bisa diresolusi dari tabel yang genuinely dinomori ini,
// kontradiksi internal PRD §5 (tabel skema) vs §10 (saran pattern
// numbering). Token DIHAPUS, scope_level=TENANT (counter tunggal
// tenant-wide), pola PERSIS QUALITY_COMPLAINT (5.1) utk alasan struktural
// yang sama (site_id nullable di sana; company_id TIDAK ADA SAMA SEKALI di
// sini, kasus lebih ketat), gap TDD §26. `CONTRACTOR_ASSIGNMENT` TIDAK py
// masalah ini — `contractor_project_assignments.site_id` NOT NULL literal,
// SITE_CODE normal.
const PREQUALIFICATION_NUMBERING_MODULE_CODE = "CONTRACTOR_PQ";
const PREQUALIFICATION_NUMBERING_PATTERN = "PQ/{YYYY}/{SEQ:4}";
const ASSIGNMENT_NUMBERING_MODULE_CODE = "CONTRACTOR_ASSIGNMENT";
const ASSIGNMENT_NUMBERING_PATTERN = "CTR/{SITE_CODE}/{YYYY}/{SEQ:4}";
// PRD §4.1 poin 4 "entity_type='contractor_prequalification', stage
// disarankan: (1) Review Contractor Coordinator, (2) Approval HSE Manager.
// SLA disarankan 5 hari kerja per stage" (120 jam/stage, konversi kalender
// x24 — pola PERSIS AUDIT_PROGRAM_STAGE_SLA_HOURS 4.1/ASPECT_REVIEW_STAGE_SLA_HOURS
// 5.2, business-day calendar utility 1.1 TIDAK dipakai). "Contractor
// Coordinator" dipetakan HSE_OFFICER existing (role folding, lihat banner
// comment ROLE_PERMISSIONS blok Modul 17 di seed-rbac-baseline.ts).
const PREQUALIFICATION_MODULE_CODE = "CONTRACTOR_PREQUALIFICATION";
const PREQUALIFICATION_STAGE_SLA_HOURS = 120;
// PRD §4.4 poin 2 "Approval oleh HSE Manager (workflow
// entity_type='contractor_performance_evaluation', 1 stage)" — TIDAK ADA
// angka SLA sama sekali (beda §4.1 poin 4 di atas yang eksplisit beri "5
// hari kerja") — diinvent REUSE 120 jam, angka literal PRD MODUL INI
// SENDIRI (stage prequalification di atas, aktor sama HSE Manager),
// preseden lokal paling konsisten drpd mengarang angka baru, gap TDD §26.
const EVALUATION_MODULE_CODE = "CONTRACTOR_PERFORMANCE_EVALUATION";
const EVALUATION_STAGE_SLA_HOURS = 120;
const PREQUALIFICATION_WORKFLOW_NAME = "Contractor Prequalification Review & Approval — 2 Stage";
const EVALUATION_WORKFLOW_NAME = "Contractor Performance Evaluation Approval — 1 Stage";
let ContractorWorkflowBootstrapService = class ContractorWorkflowBootstrapService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureNumberingConfig(moduleCode, pattern, scopeLevel, siteId) {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        const scopeId = scopeLevel === "SITE" ? (siteId ?? null) : null;
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode, scopeId } });
            if (existing)
                return existing;
            return tx.numberingConfig.create({
                data: { tenantId, moduleCode, pattern, prefix: moduleCode.slice(0, 20), resetPeriod: "YEARLY", scopeLevel, scopeId },
            });
        });
    }
    async ensurePrequalificationNumberingConfig() {
        return this.ensureNumberingConfig(PREQUALIFICATION_NUMBERING_MODULE_CODE, PREQUALIFICATION_NUMBERING_PATTERN, "TENANT");
    }
    async ensureAssignmentNumberingConfig(siteId) {
        return this.ensureNumberingConfig(ASSIGNMENT_NUMBERING_MODULE_CODE, ASSIGNMENT_NUMBERING_PATTERN, "SITE", siteId);
    }
    async findRoleOrThrow(tx, roleCode) {
        const role = await tx.role.findFirst({ where: { tenantId: null, roleCode } });
        if (!role) {
            throw new common_1.NotFoundException(`Role sistem "${roleCode}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Contractor bisa membuat workflow_definitions default.`);
        }
        return role;
    }
    async ensurePrequalificationWorkflowDefinition(tx) {
        return this.ensureStagedDefinition(tx, PREQUALIFICATION_MODULE_CODE, PREQUALIFICATION_WORKFLOW_NAME, [
            { stageName: "Review Contractor Coordinator", roleCode: "HSE_OFFICER", slaHours: PREQUALIFICATION_STAGE_SLA_HOURS },
            { stageName: "Approval HSE Manager", roleCode: "HSE_MANAGER", slaHours: PREQUALIFICATION_STAGE_SLA_HOURS },
        ]);
    }
    async ensureEvaluationWorkflowDefinition(tx) {
        return this.ensureStagedDefinition(tx, EVALUATION_MODULE_CODE, EVALUATION_WORKFLOW_NAME, [
            { stageName: "Approval HSE Manager", roleCode: "HSE_MANAGER", slaHours: EVALUATION_STAGE_SLA_HOURS },
        ]);
    }
    async ensureStagedDefinition(tx, moduleCode, name, stages) {
        const tenantId = (0, contractor_context_1.requireTenantId)();
        const existing = await tx.workflowDefinition.findFirst({ where: { tenantId, moduleCode, isActive: true }, orderBy: { version: "desc" } });
        if (existing)
            return existing;
        const definition = await tx.workflowDefinition.create({ data: { tenantId, moduleCode, name, isActive: true, version: 1 } });
        const stageRows = [];
        for (let i = 0; i < stages.length; i++) {
            const role = await this.findRoleOrThrow(tx, stages[i].roleCode);
            const stage = await tx.workflowStage.create({
                data: {
                    tenantId,
                    workflowDefinitionId: definition.id,
                    sequenceNo: i + 1,
                    stageName: stages[i].stageName,
                    approverType: "ROLE_IN_SCOPE",
                    approverRoleId: role.id,
                    slaHours: stages[i].slaHours,
                    escalationAction: "NOTIFY_SUPERIOR",
                    allowDelegation: true,
                },
            });
            stageRows.push(stage);
        }
        for (let i = 0; i < stageRows.length; i++) {
            const isLast = i === stageRows.length - 1;
            await tx.workflowTransition.createMany({
                data: [
                    {
                        tenantId,
                        workflowDefinitionId: definition.id,
                        fromStageId: stageRows[i].id,
                        toStageId: isLast ? null : stageRows[i + 1].id,
                        triggerAction: "APPROVE",
                        resultStatus: isLast ? "APPROVED" : undefined,
                    },
                    { tenantId, workflowDefinitionId: definition.id, fromStageId: stageRows[i].id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED" },
                ],
            });
        }
        return definition;
    }
};
exports.ContractorWorkflowBootstrapService = ContractorWorkflowBootstrapService;
exports.ContractorWorkflowBootstrapService = ContractorWorkflowBootstrapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContractorWorkflowBootstrapService);
