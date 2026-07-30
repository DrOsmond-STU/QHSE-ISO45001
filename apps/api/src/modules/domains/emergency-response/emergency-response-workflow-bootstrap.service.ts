import { Injectable, NotFoundException } from "@nestjs/common";
import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireTenantId } from "./emergency-response-context";

const EMERGENCY_PLAN_NUMBERING_MODULE_CODE = "EMERGENCY_PLAN";
const EMERGENCY_DRILL_NUMBERING_MODULE_CODE = "EMERGENCY_DRILL";
const EMERGENCY_PLAN_NUMBERING_PATTERN = "ERP/{SITE_CODE}/{YYYY}/{SEQ:3}";
const EMERGENCY_DRILL_NUMBERING_PATTERN = "DRILL/{SITE_CODE}/{YYYY}/{SEQ:3}";

// PRD §4.1 "Stage default: Draft HSE Officer -> Review HSE Manager (SLA 5
// hari kerja) -> Approval Top Management/Site Manager (untuk level tinggi
// saja)" — TIDAK ada integrasi business-day calendar ke slaHours (kolom
// murni jam kalender INT, pola sama Incident 3.5 gap TDD §26) — 5 hari
// kerja didekati 5x24=120 jam kalender flat.
const PLAN_REVIEW_STAGE_SLA_HOURS = 120;
// PRD tidak beri SLA eksplisit utk stage kondisional level tinggi —
// didekati SAMA (120 jam) krn tidak ada angka lain yang lebih otoritatif
// utk didekati, gap TDD §26.
const PLAN_HIGH_SEVERITY_APPROVAL_STAGE_SLA_HOURS = 120;

const EMERGENCY_PLAN_WORKFLOW_NAME =
  "Emergency Response Plan Approval — 1/2 Stage (Review HSE Manager -> [kondisional] Approval Level Tinggi)";

/**
 * Task 3.7 — pola PERSIS IncidentWorkflowBootstrapService (3.5)/
 * WorkPermitWorkflowBootstrapService (3.3): numbering_configs (0.10) DAN
 * workflow_definitions+stages+transitions (0.9) di-lazy-create idempotent.
 * Modul ini punya DUA numbering module_code sekaligus (EMERGENCY_PLAN utk
 * emergency_response_plans, EMERGENCY_DRILL utk emergency_drills) —
 * KEDUANYA scope_level=SITE (pola sama Work Permit/Incident/Inspection,
 * PRD §5 "Numbering & Attachments" eksplisit menyebut keduanya).
 */
@Injectable()
export class EmergencyResponseWorkflowBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async ensurePlanNumberingConfig(siteId: string): Promise<NumberingConfig> {
    return this.ensureNumberingConfig(siteId, EMERGENCY_PLAN_NUMBERING_MODULE_CODE, EMERGENCY_PLAN_NUMBERING_PATTERN, "ERP");
  }

  async ensureDrillNumberingConfig(siteId: string): Promise<NumberingConfig> {
    return this.ensureNumberingConfig(siteId, EMERGENCY_DRILL_NUMBERING_MODULE_CODE, EMERGENCY_DRILL_NUMBERING_PATTERN, "DRILL");
  }

  private async ensureNumberingConfig(siteId: string, moduleCode: string, pattern: string, prefix: string): Promise<NumberingConfig> {
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode, scopeId: siteId } });
      if (existing) return existing;

      return tx.numberingConfig.create({
        data: { tenantId, moduleCode, pattern, prefix, resetPeriod: "YEARLY", scopeLevel: "SITE", scopeId: siteId },
      });
    });
  }

  private async findRoleOrThrow(tx: Prisma.TransactionClient, roleCode: string) {
    const role = await tx.role.findFirst({ where: { tenantId: null, roleCode } });
    if (!role) {
      throw new NotFoundException(
        `Role sistem "${roleCode}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Emergency Response bisa membuat workflow_definitions default.`,
      );
    }
    return role;
  }

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
  async ensureWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    const tenantId = requireTenantId();

    // PRD §4.1 literal "module_code = EMERGENCY_PLAN (Workflow Engine
    // generik)" — SAMA string dgn numbering_configs plan (kebetulan sesuai
    // PRD, bukan konvensi umum modul lain yang biasanya pakai module_code
    // permission RBAC-nya, mis. "INCIDENT"/"INSPECTION").
    const existing = await tx.workflowDefinition.findFirst({
      where: { tenantId, moduleCode: EMERGENCY_PLAN_NUMBERING_MODULE_CODE, name: EMERGENCY_PLAN_WORKFLOW_NAME, isActive: true },
      orderBy: { version: "desc" },
    });
    if (existing) return existing;

    const hseManagerRole = await this.findRoleOrThrow(tx, "HSE_MANAGER");

    const definition = await tx.workflowDefinition.create({
      data: { tenantId, moduleCode: EMERGENCY_PLAN_NUMBERING_MODULE_CODE, name: EMERGENCY_PLAN_WORKFLOW_NAME, isActive: true, version: 1 },
    });

    const stage1 = await tx.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 1,
        stageName: "Review HSE Manager",
        approverType: "ROLE_IN_SCOPE",
        approverRoleId: hseManagerRole.id,
        slaHours: PLAN_REVIEW_STAGE_SLA_HOURS,
        escalationAction: "NOTIFY_SUPERIOR",
        allowDelegation: true,
      },
    });
    const stage2 = await tx.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 2,
        stageName: "Approval Level Tinggi (Top Management/Site Manager)",
        approverType: "ROLE_IN_SCOPE",
        approverRoleId: hseManagerRole.id,
        slaHours: PLAN_HIGH_SEVERITY_APPROVAL_STAGE_SLA_HOURS,
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
          condition: { "!=": [{ var: "severityLevel" }, "LEVEL_1_LOCAL"] },
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
}
