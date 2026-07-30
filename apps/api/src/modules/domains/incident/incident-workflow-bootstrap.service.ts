import { Injectable, NotFoundException } from "@nestjs/common";
import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireTenantId } from "./incident-context";

const INCIDENT_MODULE_CODE = "INCIDENT";
// PRD §4 "3 hari kerja" (Stage 1) — TIDAK ada integrasi business-day
// calendar ke slaHours di WorkflowStage manapun di codebase ini (kolom
// murni jam kalender INT); dikonversi 3x24 jam kalender, pola sama SLA
// "X hari"/"X jam" modul lain (mis. Work Permit 3.3) yang juga tidak pernah
// benar-benar terhubung ke HolidayCalendarService (task 1.2).
const INVESTIGATION_REVIEW_STAGE_SLA_HOURS = 72;
// PRD §4 "Sesuai tenggat regulasi" (Stage 2) — INHEREN dinamis per baris
// incident_regulatory_reports (required_by_date), TIDAK bisa direpresentasikan
// slaHours TETAP per workflow_definition (satu nilai utk seluruh instance) —
// konstanta approksimasi (matching DEFAULT_REGULATORY_REPORT_TENGGAT_HOURS,
// incident-regulatory-report-rules.ts), gap didokumentasikan TDD §26.
const REGULATORY_REPORT_APPROVAL_STAGE_SLA_HOURS = 48;

const INCIDENT_NUMBERING_PATTERN = "{PREFIX}/{SITE_CODE}/{YYYY}/{SEQ:4}";
const INCIDENT_INVESTIGATION_WORKFLOW_NAME =
  "Incident Investigation — 1/2 Level (Review Laporan Investigasi -> [kondisional] Persetujuan Pelaporan Regulator)";

// Task 3.5 — pola PERSIS WorkPermitWorkflowBootstrapService (3.3):
// numbering_configs (0.10) DAN workflow_definitions+stages+transitions (0.9)
// di-lazy-create idempotent saat pertama dibutuhkan.
@Injectable()
export class IncidentWorkflowBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  // PRD §5 "Numbering — module_code=INCIDENT, pattern INC/{SITE_CODE}/{YYYY}/
  // {SEQ:4}, reset_period=YEARLY, scope_level=SITE" — scope_level=SITE, pola
  // PERSIS Work Permit (3.3), KEDUA modul yang genuinely mempartisi counter
  // per-site (bukan tenant-wide).
  async ensureNumberingConfig(siteId: string): Promise<NumberingConfig> {
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode: INCIDENT_MODULE_CODE, scopeId: siteId } });
      if (existing) return existing;

      return tx.numberingConfig.create({
        data: {
          tenantId,
          moduleCode: INCIDENT_MODULE_CODE,
          pattern: INCIDENT_NUMBERING_PATTERN,
          prefix: "INC",
          resetPeriod: "YEARLY",
          scopeLevel: "SITE",
          scopeId: siteId,
        },
      });
    });
  }

  private async findRoleOrThrow(tx: Prisma.TransactionClient, roleCode: string) {
    const role = await tx.role.findFirst({ where: { tenantId: null, roleCode } });
    if (!role) {
      throw new NotFoundException(
        `Role sistem "${roleCode}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Incident bisa membuat workflow_definitions default.`,
      );
    }
    return role;
  }

  /**
   * PRD §4 poin 7 "HSE Manager menyetujui via Workflow Engine
   * (entity_type=incident_investigation)" + tabel konfigurasi default — Stage
   * 1 Review Laporan Investigasi (HSE_MANAGER, SELALU — mengajukan berarti
   * investigasi sudah ada, jadi "jika investigasi wajib" §4 SUDAH terpenuhi
   * by construction saat workflow ini dimulai) -> [kondisional] Stage 2
   * Persetujuan Pelaporan Regulator (HSE_MANAGER JUGA — BEDA dari Work
   * Permit/HIRA yang pakai role berbeda per stage, PRD literal memang
   * menyebut HSE Manager utk KEDUA stage). KEEMPAT KALINYA JSON Logic
   * condition dipakai pada workflow_transitions di seluruh codebase (setelah
   * HIRA 3.2, Work Permit Stage 2 HSE 3.3, Work Permit Extension 3.4) —
   * pola IDENTIK: dua baris dari stage1 dgn triggerAction=APPROVE sama tapi
   * condition+priority beda; priority 0 mengecek contextData.hasRegulatoryReport
   * ===true -> lanjut stage2; priority 1 fallback (condition=null) -> langsung
   * terminal APPROVED. contextData.hasRegulatoryReport diisi
   * IncidentInvestigationService.submitForApproval() SEBELUM startInstance()
   * (query keberadaan incident_regulatory_reports utk incident_report_id
   * terkait, BR-03) — WorkflowEngineService sendiri TIDAK PERNAH fetch data
   * domain.
   */
  async ensureWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    const tenantId = requireTenantId();

    const existing = await tx.workflowDefinition.findFirst({
      where: { tenantId, moduleCode: INCIDENT_MODULE_CODE, name: INCIDENT_INVESTIGATION_WORKFLOW_NAME, isActive: true },
      orderBy: { version: "desc" },
    });
    if (existing) return existing;

    const hseManagerRole = await this.findRoleOrThrow(tx, "HSE_MANAGER");

    const definition = await tx.workflowDefinition.create({
      data: { tenantId, moduleCode: INCIDENT_MODULE_CODE, name: INCIDENT_INVESTIGATION_WORKFLOW_NAME, isActive: true, version: 1 },
    });

    const stage1 = await tx.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 1,
        stageName: "Review Laporan Investigasi",
        approverType: "ROLE_IN_SCOPE",
        approverRoleId: hseManagerRole.id,
        slaHours: INVESTIGATION_REVIEW_STAGE_SLA_HOURS,
        escalationAction: "NOTIFY_SUPERIOR",
        allowDelegation: true,
      },
    });
    const stage2 = await tx.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 2,
        stageName: "Persetujuan Pelaporan Regulator",
        approverType: "ROLE_IN_SCOPE",
        approverRoleId: hseManagerRole.id,
        slaHours: REGULATORY_REPORT_APPROVAL_STAGE_SLA_HOURS,
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
          condition: { "==": [{ var: "hasRegulatoryReport" }, true] },
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
