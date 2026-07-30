import { Injectable, NotFoundException } from "@nestjs/common";
import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireTenantId } from "./regulatory-compliance-context";

const COMPLIANCE_MODULE_CODE = "COMPLIANCE";
const COMPLIANCE_NUMBERING_PATTERN = "{PREFIX}/{YYYY}/{SEQ:4}";
const COMPLIANCE_NUMBERING_PREFIX = "EVAL";

// PRD §4.2 poin 2 — "1 stage 'Review HSE Manager' (SLA 5 hari kerja)",
// diapproksimasi 5 hari KALENDER (120 jam) — pola PERSIS
// DmsBootstrapService (2.1) yang juga tidak business-day-aware (gap #23
// sejak 1.1, konsisten bukan pengecualian baru).
const COMPLIANCE_STAGE_SLA_HOURS = 120;
const COMPLIANCE_APPROVER_ROLE_CODE = "HSE_MANAGER";
const COMPLIANCE_WORKFLOW_DEFINITION_NAME = "Evaluasi Kepatuhan — 1 Level (Review HSE Manager)";

// Task 2.2 — pola PERSIS DmsBootstrapService (2.1): numbering_configs (0.10)
// DAN workflow_definitions+stages+transitions (0.9) di-lazy-create PER
// TENANT saat pertama dibutuhkan (find-or-create, idempotent), BUKAN
// disentuh dari ProvisioningService (1.5, gap TDD §26 sama persis).
@Injectable()
export class RegulatoryComplianceBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureNumberingConfig(): Promise<NumberingConfig> {
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const existing = await tx.numberingConfig.findFirst({
        where: { tenantId, moduleCode: COMPLIANCE_MODULE_CODE, scopeId: null },
      });
      if (existing) return existing;

      return tx.numberingConfig.create({
        data: {
          tenantId,
          moduleCode: COMPLIANCE_MODULE_CODE,
          pattern: COMPLIANCE_NUMBERING_PATTERN,
          prefix: COMPLIANCE_NUMBERING_PREFIX,
          resetPeriod: "YEARLY",
          scopeLevel: "TENANT",
          scopeId: null,
        },
      });
    });
  }

  /**
   * PRD §4.2 poin 2 — "memakai Workflow Engine (module_code=COMPLIANCE,
   * entity_type=compliance_evaluation), template default disarankan: 1
   * stage Review HSE Manager." SATU stage ROLE_IN_SCOPE saja (BEDA dari
   * DMS 2 stage) — evaluasi tidak py konsep "context user" spesifik-entitas
   * spt Document Owner, langsung ke HSE Manager sesuai scope.
   */
  async ensureWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    const tenantId = requireTenantId();

    const existing = await tx.workflowDefinition.findFirst({
      where: { tenantId, moduleCode: COMPLIANCE_MODULE_CODE, isActive: true },
      orderBy: { version: "desc" },
    });
    if (existing) return existing;

    const hseManagerRole = await tx.role.findFirst({
      where: { tenantId: null, roleCode: COMPLIANCE_APPROVER_ROLE_CODE },
    });
    if (!hseManagerRole) {
      throw new NotFoundException(
        `Role sistem "${COMPLIANCE_APPROVER_ROLE_CODE}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Compliance bisa membuat workflow_definitions default.`,
      );
    }

    const definition = await tx.workflowDefinition.create({
      data: { tenantId, moduleCode: COMPLIANCE_MODULE_CODE, name: COMPLIANCE_WORKFLOW_DEFINITION_NAME, isActive: true, version: 1 },
    });

    const stage1 = await tx.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 1,
        stageName: "Review HSE Manager",
        approverType: "ROLE_IN_SCOPE",
        approverRoleId: hseManagerRole.id,
        slaHours: COMPLIANCE_STAGE_SLA_HOURS,
        escalationAction: "NOTIFY_SUPERIOR",
        allowDelegation: true,
      },
    });

    await tx.workflowTransition.createMany({
      data: [
        { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED" },
        { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED" },
      ],
    });

    return definition;
  }
}
