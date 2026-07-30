import { Injectable, NotFoundException } from "@nestjs/common";
import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireTenantId } from "./environmental-context";

// PRD §10/§5 — 3 numbering_configs module_code TERPISAH, ketiganya SITE
// scope (semua py token {SITE_CODE}).
const ASPECT_NUMBERING_MODULE_CODE = "ENV_ASPECT";
const ASPECT_NUMBERING_PATTERN = "EA/{SITE_CODE}/{YYYY}/{SEQ:4}";
const MONITORING_NUMBERING_MODULE_CODE = "ENV_MONITORING";
const MONITORING_NUMBERING_PATTERN = "EM/{SITE_CODE}/{YYYY}/{SEQ:4}";
const MANIFEST_NUMBERING_MODULE_CODE = "WASTE_MANIFEST";
const MANIFEST_NUMBERING_PATTERN = "WM/{SITE_CODE}/{YYYY}/{SEQ:4}";

// PRD §4.1 "module_code = ENV_ASPECT_REVIEW ... Stage default: Review
// Environmental Officer -> Approval HSE Manager (SLA 5 hari kerja)" — SATU
// angka SLA utk KEDUA stage (PRD tidak beri angka terpisah per stage,
// beda Audit 4.1 yang beri 2 angka utk 2 stage-nya) — diterapkan SAMA ke
// kedua stage, bukan diinvent split, gap TDD §26. "5 hari kerja" = 120 jam
// (konversi kalender x24, pola PERSIS AUDIT_PROGRAM_STAGE_SLA_HOURS 4.1 —
// business-day calendar utility 1.1 TIDAK dipakai di sini/modul manapun
// sejauh ini utk workflow SLA hours).
const ASPECT_REVIEW_MODULE_CODE = "ENV_ASPECT_REVIEW";
const ASPECT_REVIEW_STAGE_SLA_HOURS = 120;

// PRD §4.4 "module_code = ENV_PROPER_ASSESSMENT. Stage default: Review HSE
// Manager (SLA 10 hari kerja) -> Approval Top Management." Stage 2
// ("Approval Top Management") TIDAK diberi angka SLA sama sekali — diinvent
// 120 jam (5 hari kerja), REUSE angka literal PRD Audit 4.1's OWN "Approval
// Top Management" stage (AUDIT_PROGRAM_STAGE_SLA_HOURS) sbg preseden
// konkret satu-satunya di codebase ini utk SLA persetujuan Top Management,
// gap TDD §26.
const PROPER_ASSESSMENT_MODULE_CODE = "ENV_PROPER_ASSESSMENT";
const PROPER_REVIEW_STAGE_SLA_HOURS = 240;
const PROPER_APPROVAL_STAGE_SLA_HOURS = 120;

const ASPECT_REVIEW_WORKFLOW_NAME = "Environmental Aspect-Impact Review & Approval — 2 Stage";
const PROPER_ASSESSMENT_WORKFLOW_NAME = "PROPER Self-Assessment Review & Approval — 2 Stage";

@Injectable()
export class EnvironmentalWorkflowBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureNumberingConfig(moduleCode: string, pattern: string, siteId: string): Promise<NumberingConfig> {
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode, scopeId: siteId } });
      if (existing) return existing;
      return tx.numberingConfig.create({
        data: { tenantId, moduleCode, pattern, prefix: moduleCode, resetPeriod: "YEARLY", scopeLevel: "SITE", scopeId: siteId },
      });
    });
  }

  async ensureAspectNumberingConfig(siteId: string): Promise<NumberingConfig> {
    return this.ensureNumberingConfig(ASPECT_NUMBERING_MODULE_CODE, ASPECT_NUMBERING_PATTERN, siteId);
  }

  async ensureMonitoringNumberingConfig(siteId: string): Promise<NumberingConfig> {
    return this.ensureNumberingConfig(MONITORING_NUMBERING_MODULE_CODE, MONITORING_NUMBERING_PATTERN, siteId);
  }

  async ensureManifestNumberingConfig(siteId: string): Promise<NumberingConfig> {
    return this.ensureNumberingConfig(MANIFEST_NUMBERING_MODULE_CODE, MANIFEST_NUMBERING_PATTERN, siteId);
  }

  private async findRoleOrThrow(tx: Prisma.TransactionClient, roleCode: string) {
    const role = await tx.role.findFirst({ where: { tenantId: null, roleCode } });
    if (!role) {
      throw new NotFoundException(
        `Role sistem "${roleCode}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Environmental bisa membuat workflow_definitions default.`,
      );
    }
    return role;
  }

  async ensureAspectReviewWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    return this.ensureTwoStageDefinition(tx, ASPECT_REVIEW_MODULE_CODE, ASPECT_REVIEW_WORKFLOW_NAME, [
      { stageName: "Review Environmental Officer", roleCode: "ENVIRONMENTAL_OFFICER", slaHours: ASPECT_REVIEW_STAGE_SLA_HOURS },
      { stageName: "Approval HSE Manager", roleCode: "HSE_MANAGER", slaHours: ASPECT_REVIEW_STAGE_SLA_HOURS },
    ]);
  }

  async ensureProperAssessmentWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    return this.ensureTwoStageDefinition(tx, PROPER_ASSESSMENT_MODULE_CODE, PROPER_ASSESSMENT_WORKFLOW_NAME, [
      { stageName: "Review HSE Manager", roleCode: "HSE_MANAGER", slaHours: PROPER_REVIEW_STAGE_SLA_HOURS },
      { stageName: "Approval Top Management", roleCode: "COMPANY_ADMIN", slaHours: PROPER_APPROVAL_STAGE_SLA_HOURS },
    ]);
  }

  private async ensureTwoStageDefinition(
    tx: Prisma.TransactionClient,
    moduleCode: string,
    name: string,
    stages: Array<{ stageName: string; roleCode: string; slaHours: number }>,
  ): Promise<WorkflowDefinition> {
    const tenantId = requireTenantId();
    const existing = await tx.workflowDefinition.findFirst({ where: { tenantId, moduleCode, isActive: true }, orderBy: { version: "desc" } });
    if (existing) return existing;

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
}
