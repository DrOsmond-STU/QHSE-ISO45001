import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
/**
 * Task 3.7 — pola PERSIS IncidentWorkflowBootstrapService (3.5)/
 * WorkPermitWorkflowBootstrapService (3.3): numbering_configs (0.10) DAN
 * workflow_definitions+stages+transitions (0.9) di-lazy-create idempotent.
 * Modul ini punya DUA numbering module_code sekaligus (EMERGENCY_PLAN utk
 * emergency_response_plans, EMERGENCY_DRILL utk emergency_drills) —
 * KEDUANYA scope_level=SITE (pola sama Work Permit/Incident/Inspection,
 * PRD §5 "Numbering & Attachments" eksplisit menyebut keduanya).
 */
export declare class EmergencyResponseWorkflowBootstrapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensurePlanNumberingConfig(siteId: string): Promise<NumberingConfig>;
    ensureDrillNumberingConfig(siteId: string): Promise<NumberingConfig>;
    private ensureNumberingConfig;
    private findRoleOrThrow;
    /**
     * PRD §4.1 poin 2 + kalimat penutup §4.1. Stage 1 Review HSE Manager
     * SELALU -> [kondisional] Stage 2 Approval "Top Management/Site Manager"
     * HANYA utk severity_level LEVEL_2_SITE_WIDE/LEVEL_3_COMPANY_WIDE_EXTERNAL_AGENCY.
     * KELIMA KALINYA JSON Logic condition dipakai pada workflow_transitions
     * di seluruh codebase (setelah HIRA 3.2, Work Permit Stage 2 HSE 3.3,
     * Work Permit Extension 3.4, Incident investigasi 3.5) — pola IDENTIK:
     * dua baris dari stage1 dgn triggerAction=APPROVE sama tapi condition+
     * priority beda; priority 0 mengecek contextData.severityLevel!=="LEVEL_1_LOCAL"
     * -> lanjut stage2; priority 1 fallback (condition=null) -> langsung
     * terminal APPROVED.
     *
     * Stage 2 approver "Top Management/Site Manager" (PRD prosa) TIDAK py
     * permission_code TERPISAH di §3 RBAC table modul ini (HANYA
     * emergency_response.plan.approve, milik HSE Manager/QHSE Head) — pola
     * sama Incident 3.5 ("kedua stage sama-sama HSE_MANAGER" krn PRD-nya
     * juga tidak beri role approve terpisah utk stage kondisional) — KEDUA
     * stage di sini JUGA memakai role HSE_MANAGER yang SAMA, TDD §26.
     */
    ensureWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition>;
}
