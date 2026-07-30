import { Injectable, NotFoundException } from "@nestjs/common";
import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireTenantId } from "./quality-context";

// PRD §10 — 3 numbering_configs module_code TERPISAH.
const NCR_NUMBERING_MODULE_CODE = "QUALITY_NCR";
const NCR_NUMBERING_PATTERN = "NCR/{SITE_CODE}/{YYYY}/{SEQ:4}";
const COMPLAINT_NUMBERING_MODULE_CODE = "QUALITY_COMPLAINT";
// PRD §10 literal "CC/{YYYY}/{SEQ:4}" — TANPA token {SITE_CODE}/{COMPANY_CODE}
// (konsisten customer_complaints.site_id NULLABLE, "site produsen JIKA
// teridentifikasi") — scope_level=TENANT (counter tunggal tenant-wide),
// pola PERSIS DMS 2.1/Compliance 2.2.
const COMPLAINT_NUMBERING_PATTERN = "CC/{YYYY}/{SEQ:4}";
const INSPECTION_NUMBERING_MODULE_CODE = "QUALITY_INSPECTION";
const INSPECTION_NUMBERING_PATTERN = "QI/{SITE_CODE}/{YYYY}/{SEQ:4}";

// PRD §4 workflow module_code literal: QUALITY_NCR (3-stage), QUALITY_COMPLAINT
// (3-stage), QUALITY_INSPECTION_DEVIATION (1-stage). PERTAMA KALI satu modul
// domain butuh TIGA workflow_definitions process sekaligus (Audit 4.1 hanya
// 2). Stage 3 KEDUA workflow 3-stage ("Verifikasi Penutupan"/"Konfirmasi
// Penutupan") TIDAK diberi approver eksplisit oleh PRD §4 (beda Stage 1/2
// yang eksplisit sebut Supervisor/Quality Manager) — dipetakan QUALITY_MANAGER
// (role "approval tertinggi modul mutu" §3, kandidat paling plausible),
// SLA diinvent 24 jam (PRD tidak beri angka utk stage 3 di kedua workflow),
// gap TDD §26. QUALITY_COMPLAINT Stage 1 "Investigasi oleh QC Inspector/
// Quality Manager" dipetakan QC_INSPECTOR (kandidat operasional, Quality
// Manager sudah dapat Stage 2/3); SLA "sesuai kesepakatan pelanggan" (TIDAK
// ADA angka konkret) diinvent 72 jam, gap TDD §26.
const NCR_MODULE_CODE = "QUALITY_NCR";
const COMPLAINT_MODULE_CODE = "QUALITY_COMPLAINT";
const INSPECTION_DEVIATION_MODULE_CODE = "QUALITY_INSPECTION_DEVIATION";
// PRD §4.4 "module_code=QUALITY_SUPPLIER_EVAL. Stage default: Review Quality
// Manager (SLA 5 hari kerja) -> Approve & Publish." — dibaca SATU stage
// (Quality Manager me-review DAN meng-approve+publish sekaligus, "Approve &
// Publish" adalah HASIL approval bukan approver terpisah), pola sama
// Compliance 2.2's 1-stage evaluation workflow.
const SUPPLIER_EVAL_MODULE_CODE = "QUALITY_SUPPLIER_EVAL";

const NCR_WORKFLOW_NAME = "NCR Disposition & Closure — 3 Stage";
const COMPLAINT_WORKFLOW_NAME = "Customer Complaint Investigation & Closure — 3 Stage";
const INSPECTION_DEVIATION_WORKFLOW_NAME = "Quality Inspection Deviation Approval — 1 Stage";
const SUPPLIER_EVAL_WORKFLOW_NAME = "Supplier Quality Evaluation Approve & Publish — 1 Stage";

@Injectable()
export class QualityWorkflowBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureNumberingConfig(moduleCode: string, pattern: string, scopeLevel: "SITE" | "TENANT", siteId?: string): Promise<NumberingConfig> {
    const tenantId = requireTenantId();
    const scopeId = scopeLevel === "SITE" ? (siteId ?? null) : null;
    return this.prisma.withRls(async (tx) => {
      const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode, scopeId } });
      if (existing) return existing;
      return tx.numberingConfig.create({
        data: { tenantId, moduleCode, pattern, prefix: moduleCode, resetPeriod: "YEARLY", scopeLevel, scopeId },
      });
    });
  }

  async ensureNcrNumberingConfig(siteId: string): Promise<NumberingConfig> {
    return this.ensureNumberingConfig(NCR_NUMBERING_MODULE_CODE, NCR_NUMBERING_PATTERN, "SITE", siteId);
  }

  async ensureComplaintNumberingConfig(): Promise<NumberingConfig> {
    return this.ensureNumberingConfig(COMPLAINT_NUMBERING_MODULE_CODE, COMPLAINT_NUMBERING_PATTERN, "TENANT");
  }

  async ensureInspectionNumberingConfig(siteId: string): Promise<NumberingConfig> {
    return this.ensureNumberingConfig(INSPECTION_NUMBERING_MODULE_CODE, INSPECTION_NUMBERING_PATTERN, "SITE", siteId);
  }

  private async findRoleOrThrow(tx: Prisma.TransactionClient, roleCode: string) {
    const role = await tx.role.findFirst({ where: { tenantId: null, roleCode } });
    if (!role) {
      throw new NotFoundException(
        `Role sistem "${roleCode}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Quality bisa membuat workflow_definitions default.`,
      );
    }
    return role;
  }

  async ensureNcrWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    return this.ensureThreeStageDefinition(
      tx,
      NCR_MODULE_CODE,
      NCR_WORKFLOW_NAME,
      [
        { stageName: "Review Supervisor", roleCode: "SUPERVISOR", slaHours: 24 },
        { stageName: "Approval Disposisi Quality Manager", roleCode: "QUALITY_MANAGER", slaHours: 48 },
        { stageName: "Verifikasi Penutupan", roleCode: "QUALITY_MANAGER", slaHours: 24 },
      ],
    );
  }

  async ensureComplaintWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    return this.ensureThreeStageDefinition(
      tx,
      COMPLAINT_MODULE_CODE,
      COMPLAINT_WORKFLOW_NAME,
      [
        { stageName: "Investigasi QC Inspector", roleCode: "QC_INSPECTOR", slaHours: 72 },
        { stageName: "Review & Approval Quality Manager", roleCode: "QUALITY_MANAGER", slaHours: 48 },
        { stageName: "Konfirmasi Penutupan", roleCode: "QUALITY_MANAGER", slaHours: 24 },
      ],
    );
  }

  async ensureInspectionDeviationWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    return this.ensureSingleStageDefinition(tx, INSPECTION_DEVIATION_MODULE_CODE, INSPECTION_DEVIATION_WORKFLOW_NAME, "Approval Deviasi Quality Manager", "QUALITY_MANAGER", 24);
  }

  async ensureSupplierEvalWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    return this.ensureSingleStageDefinition(tx, SUPPLIER_EVAL_MODULE_CODE, SUPPLIER_EVAL_WORKFLOW_NAME, "Review & Approve/Publish Quality Manager", "QUALITY_MANAGER", 120);
  }

  private async ensureSingleStageDefinition(
    tx: Prisma.TransactionClient,
    moduleCode: string,
    name: string,
    stageName: string,
    roleCode: string,
    slaHours: number,
  ): Promise<WorkflowDefinition> {
    const tenantId = requireTenantId();
    const existing = await tx.workflowDefinition.findFirst({ where: { tenantId, moduleCode, isActive: true }, orderBy: { version: "desc" } });
    if (existing) return existing;

    const role = await this.findRoleOrThrow(tx, roleCode);
    const definition = await tx.workflowDefinition.create({ data: { tenantId, moduleCode, name, isActive: true, version: 1 } });
    const stage1 = await tx.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 1,
        stageName,
        approverType: "ROLE_IN_SCOPE",
        approverRoleId: role.id,
        slaHours,
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

  private async ensureThreeStageDefinition(
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
