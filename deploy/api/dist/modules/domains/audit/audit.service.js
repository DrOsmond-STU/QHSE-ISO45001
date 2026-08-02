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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../platform/tenancy/prisma.service");
const numbering_service_1 = require("../../../platform/numbering/numbering.service");
const audit_context_1 = require("./audit-context");
const audit_workflow_bootstrap_service_1 = require("./audit-workflow-bootstrap.service");
const audit_lifecycle_1 = require("./audit-lifecycle");
const audit_program_lifecycle_1 = require("./audit-program-lifecycle");
const auditor_competency_rules_1 = require("./auditor-competency-rules");
const AUDIT_NUMBERING_MODULE_CODE = "AUDIT";
/**
 * Task 4.1 (Modul 09 §4 poin 2/5, §3 "Audit Program Owner/MR |
 * audit.audit.schedule"). BELUM ada controller HTTP. companyId/branchId
 * SELALU diturunkan dari site (bukan input caller terpisah), pola PERSIS
 * InspectionRecordService (3.6) — "lokasi auditee" (PRD §5) sepenuhnya
 * ditentukan site-nya.
 */
let AuditService = class AuditService {
    prisma;
    numberingService;
    bootstrapService;
    constructor(prisma, numberingService, bootstrapService) {
        this.prisma = prisma;
        this.numberingService = numberingService;
        this.bootstrapService = bootstrapService;
    }
    /**
     * PRD §4 poin 2 "Dari setiap audit_program_plan_items, dibuat instance
     * audits." linked_audit_id (plan item) + audit_program_plan_item_id
     * (audit) diisi ATOMIK dalam TRANSAKSI KEDUA (setelah baris audits
     * genuinely ada, krn linked_audit_id butuh FK ke audit.id yang baru
     * dibuat) — TIDAK atomik lintas KEDUA transaksi (create audit vs update
     * plan item), gap TDD §26 konsisten pola "tidak atomik lintas langkah"
     * (DMS 2.1, dst). APPROVED->IN_PROGRESS pada audit_programs induk
     * (side-effect "audit pertama dibuat dari program ini") DIGABUNG di
     * transaksi kedua yang sama.
     */
    async createFromPlanItem(auditProgramPlanItemId, input) {
        const createdBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        const planItem = await this.prisma.withRls((tx) => tx.auditProgramPlanItem.findUniqueOrThrow({ where: { id: auditProgramPlanItemId } }));
        if (planItem.linkedAuditId) {
            throw new Error("audit_program_plan_items ini sudah memiliki audit terkait (linked_audit_id terisi).");
        }
        (0, audit_program_lifecycle_1.validateAuditProgramPlanItemStatusTransition)(planItem.status, "EXECUTED");
        const audit = await this.createAuditRow(tenantId, createdBy, auditProgramPlanItemId, input);
        await this.prisma.withRls(async (tx) => {
            await tx.auditProgramPlanItem.update({
                where: { id: auditProgramPlanItemId },
                data: { status: "EXECUTED", linkedAuditId: audit.id, updatedBy: createdBy },
            });
            const program = await tx.auditProgram.findUnique({ where: { id: planItem.auditProgramId } });
            if (program && program.status === "APPROVED") {
                await tx.auditProgram.update({ where: { id: program.id }, data: { status: "IN_PROGRESS", updatedBy: createdBy } });
            }
        });
        return audit;
    }
    // PRD §4 poin 2 "Audit ad-hoc di luar program (mis. audit investigasi
    // khusus/surveillance mendadak) juga dapat dibuat langsung."
    async createAdHoc(input) {
        const createdBy = (0, audit_context_1.requireActorUserId)();
        const tenantId = (0, audit_context_1.requireTenantId)();
        return this.createAuditRow(tenantId, createdBy, null, input);
    }
    async createAuditRow(tenantId, createdBy, auditProgramPlanItemId, input) {
        await this.bootstrapService.ensureNumberingConfig(input.siteId);
        const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true, companyId: true, branchId: true } }));
        const auditNumber = await this.numberingService.generateNext(AUDIT_NUMBERING_MODULE_CODE, {
            scopeId: input.siteId,
            variables: { SITE_CODE: site.siteCode },
        });
        return this.prisma.withRls((tx) => tx.audit.create({
            data: {
                tenantId,
                auditNumber,
                auditProgramPlanItemId,
                auditTypeId: input.auditTypeId,
                auditChecklistId: input.auditChecklistId,
                companyId: site.companyId,
                branchId: site.branchId,
                siteId: input.siteId,
                leadAuditorId: input.leadAuditorId,
                plannedStartDate: input.plannedStartDate,
                plannedEndDate: input.plannedEndDate,
                status: "PLANNED",
                createdBy,
                updatedBy: createdBy,
            },
        }));
    }
    // BR-01 — soft warning (TIDAK PERNAH block transisi), lihat banner
    // comment checkLeadAuditorCompetencyWarnings.
    async start(auditId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        const audit = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id: auditId }, include: { teamMembers: true, auditChecklist: true } }));
        (0, audit_lifecycle_1.validateAuditStatusTransition)(audit.status, "IN_PROGRESS");
        const leadAuditorIds = audit.teamMembers.filter((m) => m.roleInTeam === "LEAD_AUDITOR").map((m) => m.userId);
        const competencyRecords = leadAuditorIds.length === 0
            ? []
            : await this.prisma.withRls((tx) => tx.auditorCompetencyRecord.findMany({ where: { userId: { in: leadAuditorIds } } }));
        const warnings = (0, auditor_competency_rules_1.checkLeadAuditorCompetencyWarnings)(audit.teamMembers.map((m) => ({ userId: m.userId, roleInTeam: m.roleInTeam })), competencyRecords.map((c) => ({ userId: c.userId, standardScope: c.standardScope, status: c.status, expiryDate: c.expiryDate })), audit.auditChecklist.standardCode, new Date());
        const updated = await this.prisma.withRls((tx) => tx.audit.update({ where: { id: auditId }, data: { status: "IN_PROGRESS", actualStartDate: new Date(), updatedBy } }));
        return { audit: updated, competencyWarnings: warnings };
    }
    async recordOpeningMeeting(auditId, input) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.audit.update({
            where: { id: auditId },
            data: { openingMeetingDatetime: input.datetime, openingMeetingNotes: input.notes, updatedBy },
        }));
    }
    async recordClosingMeeting(auditId, input) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        return this.prisma.withRls((tx) => tx.audit.update({
            where: { id: auditId },
            data: { closingMeetingDatetime: input.datetime, closingMeetingNotes: input.notes, updatedBy },
        }));
    }
    // Dipanggil AuditReportService.create().
    async markReportDrafted(auditId) {
        const audit = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id: auditId } }));
        (0, audit_lifecycle_1.validateAuditStatusTransition)(audit.status, "REPORT_DRAFTED");
        return this.prisma.withRls((tx) => tx.audit.update({ where: { id: auditId }, data: { status: "REPORT_DRAFTED" } }));
    }
    /**
     * Dipanggil AuditReportWorkflowCompletionListener saat workflow
     * audit_report APPROVED. PRD TIDAK beri trigger manual eksplisit utk
     * status PENDING_CAPA_CLOSURE (§5 enum literal py nilai ini tapi §4 TIDAK
     * jelaskan siapa/kapan men-set-nya) — diderivasi OTOMATIS di sini:
     * REPORT_APPROVED SELALU disentuh dulu (status transition jujur), lalu
     * kalau MASIH ada audit_findings wajib-CAPA belum CLOSED, LANGSUNG
     * lanjut ke PENDING_CAPA_CLOSURE sbg langkah kedua internal (bukan
     * transisi manual terpisah) — interpretasi, gap TDD §26.
     */
    async markReportApproved(auditId) {
        const before = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id: auditId } }));
        (0, audit_lifecycle_1.validateAuditStatusTransition)(before.status, "REPORT_APPROVED");
        await this.prisma.withRls((tx) => tx.audit.update({ where: { id: auditId }, data: { status: "REPORT_APPROVED" } }));
        const audit = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id: auditId }, include: { findings: true } }));
        const hasUnclosedMandatory = audit.findings.some((f) => f.requiresCapa && f.status !== "CLOSED");
        if (!hasUnclosedMandatory)
            return audit;
        return this.prisma.withRls((tx) => tx.audit.update({ where: { id: auditId }, data: { status: "PENDING_CAPA_CLOSURE" } }));
    }
    // BR-02/BR-03.
    async close(auditId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        const audit = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id: auditId }, include: { findings: true, report: true } }));
        (0, audit_lifecycle_1.assertAuditCloseAllowed)(audit.findings.map((f) => ({ requiresCapa: f.requiresCapa, status: f.status })), audit.report?.approvedAt ? "APPROVED" : null);
        (0, audit_lifecycle_1.validateAuditStatusTransition)(audit.status, "CLOSED");
        return this.prisma.withRls((tx) => tx.audit.update({ where: { id: auditId }, data: { status: "CLOSED", updatedBy } }));
    }
    async cancel(auditId) {
        const updatedBy = (0, audit_context_1.requireActorUserId)();
        const audit = await this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({ where: { id: auditId } }));
        (0, audit_lifecycle_1.validateAuditStatusTransition)(audit.status, "CANCELLED");
        return this.prisma.withRls((tx) => tx.audit.update({ where: { id: auditId }, data: { status: "CANCELLED", updatedBy } }));
    }
    async getById(auditId) {
        return this.prisma.withRls((tx) => tx.audit.findUniqueOrThrow({
            where: { id: auditId },
            include: { teamMembers: true, auditeeScopes: true, findings: true, report: true },
        }));
    }
    async listBySite(siteId) {
        return this.prisma.withRls((tx) => tx.audit.findMany({ where: { siteId, deletedAt: null }, orderBy: { plannedStartDate: "desc" } }));
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        numbering_service_1.NumberingService,
        audit_workflow_bootstrap_service_1.AuditWorkflowBootstrapService])
], AuditService);
//# sourceMappingURL=audit.service.js.map