import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * Task 4.1 — pola PERSIS DmsBootstrapService (2.1, plain 2-stage TANPA JSON
 * Logic condition, BEDA dari EmergencyResponseWorkflowBootstrapService 3.7
 * yang kondisional) x2 (audit_program DAN audit_report), digabung SATU
 * service krn keduanya milik modul yang sama. numbering_configs (0.10) DAN
 * KEDUA workflow_definitions+stages+transitions (0.9) di-lazy-create
 * idempotent per tenant, dipanggil dari service, BUKAN provisioning (pola
 * sama seluruh modul Phase 2+).
 */
export declare class AuditWorkflowBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureNumberingConfig(siteId: string): Promise<NumberingConfig>;
    private findRoleOrThrow;
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
    ensureAuditProgramWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
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
    ensureAuditReportWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
}
