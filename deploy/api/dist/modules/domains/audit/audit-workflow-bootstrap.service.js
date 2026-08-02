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
exports.AuditWorkflowBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const audit_context_1 = require("./audit-context");
// PRD §10 — SATU-SATUNYA numbering_configs modul ini (module_code=AUDIT,
// dipakai audits.audit_number; audit_programs/audit_checklists/audit_types
// TIDAK punya kolom nomor formal di §5, jadi TIDAK di-numbering).
const AUDIT_NUMBERING_MODULE_CODE = "AUDIT";
const AUDIT_NUMBERING_PATTERN = "AUD/{SITE_CODE}/{YYYY}/{SEQ:3}";
const AUDIT_NUMBERING_PREFIX = "AUD";
// PRD §4 tabel "Konfigurasi Workflow Engine default" — moduleCode DUA
// workflow_definitions TERPISAH (BEYOND literal PRD yang hanya menyebut
// entity_type "audit_program"/"audit_report" utk WorkflowInstance, TIDAK
// eja moduleCode workflow_definitions eksplisit — dipilih string SAMA
// dgn entity_type-nya, uppercase, konsisten konvensi modul lain yang
// moduleCode-nya = konsep utama, mis. EMERGENCY_PLAN). PERTAMA KALI satu
// modul domain butuh DUA workflow_definitions process (lihat banner
// comment di puncak blok schema.prisma Modul 09).
const AUDIT_PROGRAM_WORKFLOW_MODULE_CODE = "AUDIT_PROGRAM";
const AUDIT_REPORT_WORKFLOW_MODULE_CODE = "AUDIT_REPORT";
const AUDIT_PROGRAM_WORKFLOW_NAME = "Audit Program Approval — 2 Stage (Review MR -> Approval Top Management)";
const AUDIT_REPORT_WORKFLOW_NAME = "Audit Report Approval — 2 Stage (Review Lead Auditor -> Approval HSE/QMS Manager)";
// PRD §4 "SLA 5 hari kerja" (audit_program, kedua stage) / "SLA 3 hari
// kerja" (audit_report, kedua stage) — TIDAK ada integrasi business-day
// calendar ke slaHours (kolom murni jam kalender INT, gap TDD §26 konsisten
// seluruh modul lain sejak 1.1) — didekati flat N x 24 jam kalender.
const AUDIT_PROGRAM_STAGE_SLA_HOURS = 120;
const AUDIT_REPORT_STAGE_SLA_HOURS = 72;
/**
 * Task 4.1 — pola PERSIS DmsBootstrapService (2.1, plain 2-stage TANPA JSON
 * Logic condition, BEDA dari EmergencyResponseWorkflowBootstrapService 3.7
 * yang kondisional) x2 (audit_program DAN audit_report), digabung SATU
 * service krn keduanya milik modul yang sama. numbering_configs (0.10) DAN
 * KEDUA workflow_definitions+stages+transitions (0.9) di-lazy-create
 * idempotent per tenant, dipanggil dari service, BUKAN provisioning (pola
 * sama seluruh modul Phase 2+).
 */
let AuditWorkflowBootstrapService = class AuditWorkflowBootstrapService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureNumberingConfig(siteId) {
        const tenantId = (0, audit_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            const existing = await tx.numberingConfig.findFirst({
                where: { tenantId, moduleCode: AUDIT_NUMBERING_MODULE_CODE, scopeId: siteId },
            });
            if (existing)
                return existing;
            return tx.numberingConfig.create({
                data: {
                    tenantId,
                    moduleCode: AUDIT_NUMBERING_MODULE_CODE,
                    pattern: AUDIT_NUMBERING_PATTERN,
                    prefix: AUDIT_NUMBERING_PREFIX,
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
            throw new common_1.NotFoundException(`Role sistem "${roleCode}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Audit Management bisa membuat workflow_definitions default.`);
        }
        return role;
    }
    /**
     * PRD §4 baris "audit_program | 1. Review MR | ROLE_IN_SCOPE (MR/Audit
     * Program Owner) | 5 hari kerja" + "2. Approval Top Management |
     * SPECIFIC_USER/ROLE_IN_SCOPE | 5 hari kerja" — PRD sendiri beri PILIHAN
     * approver_type utk stage 2 ("/"); dipilih ROLE_IN_SCOPE (BUKAN
     * SPECIFIC_USER) krn skema tidak py kolom sumber "siapa Top Management
     * literal" per tenant (SPECIFIC_USER butuh approverUserId tetap yang
     * TIDAK ada tempat mengisinya) — pola sama alasan pemilihan ROLE_IN_SCOPE
     * di seluruh modul lain saat PRD beri pilihan longgar. "Audit Program
     * Owner/MR" & "Top Management" dipetakan ke HSE_MANAGER/COMPANY_ADMIN
     * (lihat banner comment AUDIT_PERMISSIONS soal role mapping, seed-rbac-baseline.ts).
     */
    async ensureAuditProgramWorkflowDefinition(tx) {
        const tenantId = (0, audit_context_1.requireTenantId)();
        const existing = await tx.workflowDefinition.findFirst({
            where: { tenantId, moduleCode: AUDIT_PROGRAM_WORKFLOW_MODULE_CODE, isActive: true },
            orderBy: { version: "desc" },
        });
        if (existing)
            return existing;
        const hseManagerRole = await this.findRoleOrThrow(tx, "HSE_MANAGER");
        const companyAdminRole = await this.findRoleOrThrow(tx, "COMPANY_ADMIN");
        const definition = await tx.workflowDefinition.create({
            data: { tenantId, moduleCode: AUDIT_PROGRAM_WORKFLOW_MODULE_CODE, name: AUDIT_PROGRAM_WORKFLOW_NAME, isActive: true, version: 1 },
        });
        const stage1 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 1,
                stageName: "Review MR/Audit Program Owner",
                approverType: "ROLE_IN_SCOPE",
                approverRoleId: hseManagerRole.id,
                slaHours: AUDIT_PROGRAM_STAGE_SLA_HOURS,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        const stage2 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 2,
                stageName: "Approval Top Management",
                approverType: "ROLE_IN_SCOPE",
                approverRoleId: companyAdminRole.id,
                slaHours: AUDIT_PROGRAM_STAGE_SLA_HOURS,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        await tx.workflowTransition.createMany({
            data: [
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: stage2.id, triggerAction: "APPROVE" },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED" },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage2.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED" },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage2.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED" },
            ],
        });
        return definition;
    }
    /**
     * PRD §4 baris "audit_report | 1. Review Lead Auditor | SPECIFIC_USER
     * (Lead Auditor audit terkait) | 3 hari kerja" — "Lead Auditor audit
     * terkait" adalah approver TERIKAT ENTITAS (beda per audit), BUKAN user
     * tetap sama di semua instance -> ini literal definisi CONTEXT_USER (task
     * 2.1 DMS), BUKAN SPECIFIC_USER walau PRD menulis kata "SPECIFIC_USER"
     * (istilah PRD longgar, lihat WorkflowApproverType banner comment schema.
     * prisma yang SUDAH menandai distingsi ini sejak 2.1). AuditReportService.
     * submitForApproval() mengisi contextData.contextUserId dari
     * audits.lead_auditor_id, pola PERSIS DocumentVersionService.
     */
    async ensureAuditReportWorkflowDefinition(tx) {
        const tenantId = (0, audit_context_1.requireTenantId)();
        const existing = await tx.workflowDefinition.findFirst({
            where: { tenantId, moduleCode: AUDIT_REPORT_WORKFLOW_MODULE_CODE, isActive: true },
            orderBy: { version: "desc" },
        });
        if (existing)
            return existing;
        const hseManagerRole = await this.findRoleOrThrow(tx, "HSE_MANAGER");
        const definition = await tx.workflowDefinition.create({
            data: { tenantId, moduleCode: AUDIT_REPORT_WORKFLOW_MODULE_CODE, name: AUDIT_REPORT_WORKFLOW_NAME, isActive: true, version: 1 },
        });
        const stage1 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 1,
                stageName: "Review Lead Auditor",
                approverType: "CONTEXT_USER",
                slaHours: AUDIT_REPORT_STAGE_SLA_HOURS,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        const stage2 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 2,
                stageName: "Approval HSE/QMS Manager",
                approverType: "ROLE_IN_SCOPE",
                approverRoleId: hseManagerRole.id,
                slaHours: AUDIT_REPORT_STAGE_SLA_HOURS,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        await tx.workflowTransition.createMany({
            data: [
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: stage2.id, triggerAction: "APPROVE" },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED" },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage2.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED" },
                { tenantId, workflowDefinitionId: definition.id, fromStageId: stage2.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED" },
            ],
        });
        return definition;
    }
};
exports.AuditWorkflowBootstrapService = AuditWorkflowBootstrapService;
exports.AuditWorkflowBootstrapService = AuditWorkflowBootstrapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditWorkflowBootstrapService);
//# sourceMappingURL=audit-workflow-bootstrap.service.js.map