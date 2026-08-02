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
exports.DmsBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const dms_context_1 = require("./dms-context");
const DMS_NUMBERING_MODULE_CODE = "DMS";
// PRD §5 "Numbering & Attachments" pattern disarankan
// "{PREFIX}/{CATEGORY_CODE}/{SITE_CODE}/{YYYY}/{SEQ:3}" — {SITE_CODE}
// SENGAJA DIJATUHKAN di sini (BEYOND/deviasi literal, gap TDD §26):
// documents.site_id NULLABLE (dokumen tenant-wide sah, PRD §5 sendiri
// eksplisit "semua NULL = berlaku tenant-wide"), sedangkan
// renderNumberPattern() (0.10) GAGAL EKSPLISIT kalau token dipakai tapi
// variables tidak menyuplainya — dokumen tenant-wide akan selalu gagal
// generate nomor kalau {SITE_CODE} tetap di pattern. SATU counter
// tenant-wide dipakai lintas SEMUA kategori (bukan reset per kategori) —
// NumberingConfig scope_level cuma TENANT/COMPANY/SITE (0.10), tidak ada
// level "per kategori".
const DMS_NUMBERING_PATTERN = "{PREFIX}/{CATEGORY_CODE}/{YYYY}/{SEQ:3}";
const DMS_NUMBERING_PREFIX = "DOC";
// PRD §4.1 "Template default disarankan 'SOP/Kebijakan — 3 Level'" — kata
// "disarankan" (BUKAN wajib literal), dan "Stage 3 Publikasi otomatis oleh
// sistem" BUKAN stage approval sungguhan (WorkflowEngineService, 0.9,
// mensyaratkan SETIAP stage py >=1 approver — sistem tidak "approve",
// createTasksForStage() akan throw kalau dipaksakan jadi stage kosong).
// Direalisasikan sbg 2 stage approval NYATA + "stage 3" = SISI DOMAIN
// bereaksi ke WORKFLOW_INSTANCE_COMPLETED_EVENT (lihat
// DocumentWorkflowCompletionListener) — bukan workflow_stages ketiga.
const DMS_WORKFLOW_DEFINITION_NAME = "SOP/Kebijakan — 3 Level (Document Owner -> HSE Manager -> Publikasi Otomatis)";
// PRD §4.1 "SLA 3 hari kerja/3 hari" — diapproksimasi 3 hari KALENDER (72
// jam), BUKAN business-day aware (HolidayCalendarService 1.2 SENGAJA belum
// di-wire ke workflow_stages.sla_hours manapun di codebase ini, gap #23
// sejak 1.1 — konsisten, bukan pengecualian baru).
const DMS_STAGE_SLA_HOURS = 72;
// Role plausible "Document Owner (biasanya Department Head/HSE Manager)" /
// "HSE Manager / Company Admin" (PRD §3) utk stage approval final —
// literal string (BUKAN impor ROLE_CODES dari prisma/seed-rbac-baseline.ts,
// modul tooling/seed, arah impor src/ -> prisma/ tidak dipakai di mana pun
// lain codebase ini).
const DMS_STAGE_2_APPROVER_ROLE_CODE = "HSE_MANAGER";
// Task 2.1 — DMS BUTUH satu numbering_configs (0.10) DAN satu
// workflow_definitions+stages+transitions (0.9) per tenant SEBELUM
// document/document_version pertama bisa dibuat — TIDAK ADA authoring
// service utk keduanya di codebase ini sejauh ini (gap #existing sejak 0.9/
// 0.10, "belum ada builder service"). BEDA dari precedent 1.1-1.6 (test
// seed langsung lewat Prisma, tidak pernah dipanggil dari kode PRODUKSI):
// task ini genuinely butuh approval WORKING utk tenant produksi manapun
// (acceptance literal "Alur approval dokumen memakai Workflow Engine
// generik"), jadi DmsBootstrapService men-LAZY-CREATE default keduanya
// PER TENANT saat pertama dibutuhkan (find-or-create, idempotent) —
// dipanggil DocumentService/DocumentVersionService, BUKAN sekali saat
// provisioning (1.5 TIDAK disentuh task ini, ProvisioningService tidak
// tahu soal DMS). Race SANGAT kecil (create-ganda) diterima tanpa row
// lock/advisory lock — first-ever create per tenant, bukan hot path;
// worst case 2 baris duplikat harmless (find-first berikutnya konsisten
// pakai salah satu), gap TDD §26.
let DmsBootstrapService = class DmsBootstrapService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureNumberingConfig() {
        const tenantId = (0, dms_context_1.requireTenantId)();
        return this.prisma.withRls(async (tx) => {
            // findFirst, BUKAN findUnique dgn compound key — scopeId NULL di
            // @@unique([tenantId, moduleCode, scopeId]) tidak bisa dipakai
            // findUnique() (Prisma menolak `null` literal di compound unique key
            // nullable, pola sama alasan NumberingService.generateNext() 0.10
            // pakai raw query "IS NOT DISTINCT FROM" alih-alih findUnique).
            const existing = await tx.numberingConfig.findFirst({
                where: { tenantId, moduleCode: DMS_NUMBERING_MODULE_CODE, scopeId: null },
            });
            if (existing)
                return existing;
            return tx.numberingConfig.create({
                data: {
                    tenantId,
                    moduleCode: DMS_NUMBERING_MODULE_CODE,
                    pattern: DMS_NUMBERING_PATTERN,
                    prefix: DMS_NUMBERING_PREFIX,
                    resetPeriod: "YEARLY",
                    scopeLevel: "TENANT",
                    scopeId: null,
                },
            });
        });
    }
    async ensureWorkflowDefinition(tx) {
        const tenantId = (0, dms_context_1.requireTenantId)();
        const existing = await tx.workflowDefinition.findFirst({
            where: { tenantId, moduleCode: DMS_NUMBERING_MODULE_CODE, isActive: true },
            orderBy: { version: "desc" },
        });
        if (existing)
            return existing;
        const hseManagerRole = await tx.role.findFirst({
            where: { tenantId: null, roleCode: DMS_STAGE_2_APPROVER_ROLE_CODE },
        });
        if (!hseManagerRole) {
            throw new common_1.NotFoundException(`Role sistem "${DMS_STAGE_2_APPROVER_ROLE_CODE}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum DMS bisa membuat workflow_definitions default.`);
        }
        const definition = await tx.workflowDefinition.create({
            data: { tenantId, moduleCode: DMS_NUMBERING_MODULE_CODE, name: DMS_WORKFLOW_DEFINITION_NAME, isActive: true, version: 1 },
        });
        const stage1 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 1,
                stageName: "Review Document Owner",
                approverType: "CONTEXT_USER",
                slaHours: DMS_STAGE_SLA_HOURS,
                escalationAction: "NOTIFY_SUPERIOR",
                allowDelegation: true,
            },
        });
        const stage2 = await tx.workflowStage.create({
            data: {
                tenantId,
                workflowDefinitionId: definition.id,
                sequenceNo: 2,
                stageName: "Approval HSE Manager",
                approverType: "ROLE_IN_SCOPE",
                approverRoleId: hseManagerRole.id,
                slaHours: DMS_STAGE_SLA_HOURS,
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
exports.DmsBootstrapService = DmsBootstrapService;
exports.DmsBootstrapService = DmsBootstrapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DmsBootstrapService);
