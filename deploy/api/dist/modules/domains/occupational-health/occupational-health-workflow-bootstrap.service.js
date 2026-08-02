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
exports.OccupationalHealthWorkflowBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const occupational_health_context_1 = require("./occupational-health-context");
// § Numbering — 2 numbering_configs module_code TERPISAH, keduanya SITE
// scope. clinic_visit_logs.visit_number ditulis "opsional" di PRD tapi
// TETAP disediakan numbering config-nya (dipanggil caller HANYA saat
// benar-benar butuh nomor, bukan wajib dipanggil tiap create).
const PAK_NUMBERING_MODULE_CODE = "OH_PAK";
const PAK_NUMBERING_PATTERN = "PAK/{SITE_CODE}/{YYYY}/{SEQ:4}";
const CLINIC_VISIT_NUMBERING_MODULE_CODE = "OH_CLINIC_VISIT";
const CLINIC_VISIT_NUMBERING_PATTERN = "CV/{SITE_CODE}/{YYYY}/{SEQ:5}";
// PRD §4.3 poin 5 — module_code=OH_PAK_CASE, stage (1) laporan awal OH
// Staff [BUKAN stage approval, itu aksi CREATE] -> (2) Physician konfirmasi
// diagnosis -> (3) HSE Manager review risiko sistemik -> (4)/(5) CAPA
// trigger/penutupan [aksi SISTEM pasca-approval, bukan stage tersendiri,
// pola sama WorkflowCompletionListener modul lain]. Diterjemahkan jadi
// WORKFLOW 2-STAGE (Physician confirm, HSE Manager review) — PRD TIDAK
// beri angka SLA sama sekali utk stage-stage ini (beda dari Environmental
// 4.1/Audit 4.1 yang eksplisit) — diinvent 120 jam (5 hari kerja), REUSE
// preseden default yang sudah dipakai berulang sesi ini (Audit "Approval
// Top Management", Environmental ASPECT_REVIEW kedua stage) drpd angka
// baru tanpa dasar, gap TDD §26. "Physician" dipetakan role
// OCCUPATIONAL_HEALTH_STAFF existing (PRD §1: dokter/paramedis klinik
// ADALAH staf ini, bukan role terpisah).
const PAK_CASE_MODULE_CODE = "OH_PAK_CASE";
const PAK_CASE_STAGE_SLA_HOURS = 120;
const PAK_CASE_WORKFLOW_NAME = "Occupational Disease Case (PAK) — Confirmation & Systemic Review — 2 Stage";
let OccupationalHealthWorkflowBootstrapService = class OccupationalHealthWorkflowBootstrapService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureNumberingConfig(moduleCode, pattern, siteId) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode, scopeId: siteId } });
            if (existing)
                return existing;
            return tx.numberingConfig.create({
                data: { tenantId, moduleCode, pattern, prefix: moduleCode, resetPeriod: "YEARLY", scopeLevel: "SITE", scopeId: siteId },
            });
        });
    }
    async ensurePakNumberingConfig(siteId) {
        return this.ensureNumberingConfig(PAK_NUMBERING_MODULE_CODE, PAK_NUMBERING_PATTERN, siteId);
    }
    async ensureClinicVisitNumberingConfig(siteId) {
        return this.ensureNumberingConfig(CLINIC_VISIT_NUMBERING_MODULE_CODE, CLINIC_VISIT_NUMBERING_PATTERN, siteId);
    }
    async findRoleOrThrow(tx, roleCode) {
        const role = await tx.role.findFirst({ where: { tenantId: null, roleCode } });
        if (!role) {
            throw new common_1.NotFoundException(`Role sistem "${roleCode}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Occupational Health bisa membuat workflow_definitions default.`);
        }
        return role;
    }
    async ensurePakCaseWorkflowDefinition(tx) {
        return this.ensureTwoStageDefinition(tx, PAK_CASE_MODULE_CODE, PAK_CASE_WORKFLOW_NAME, [
            { stageName: "Konfirmasi Diagnosis oleh Physician", roleCode: "OCCUPATIONAL_HEALTH_STAFF", slaHours: PAK_CASE_STAGE_SLA_HOURS },
            { stageName: "Review Risiko Sistemik oleh HSE Manager", roleCode: "HSE_MANAGER", slaHours: PAK_CASE_STAGE_SLA_HOURS },
        ]);
    }
    async ensureTwoStageDefinition(tx, moduleCode, name, stages) {
        const tenantId = (0, occupational_health_context_1.requireTenantId)();
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
exports.OccupationalHealthWorkflowBootstrapService = OccupationalHealthWorkflowBootstrapService;
exports.OccupationalHealthWorkflowBootstrapService = OccupationalHealthWorkflowBootstrapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OccupationalHealthWorkflowBootstrapService);
//# sourceMappingURL=occupational-health-workflow-bootstrap.service.js.map