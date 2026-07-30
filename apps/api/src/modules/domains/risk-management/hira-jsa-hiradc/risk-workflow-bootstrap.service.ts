import { Injectable, NotFoundException } from "@nestjs/common";
import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { requireTenantId } from "../matrix/risk-matrix-context";

const RISK_MODULE_CODE = "RISK";
const RISK_STAGE_SLA_HOURS = 72;
const JSA_STAGE_SLA_HOURS = 24;
const HIRADC_STAGE_SLA_HOURS = 4;

const HIRA_NUMBERING_PATTERN = "{PREFIX}/{SITE_CODE}/{YYYY}/{SEQ:3}";
const JSA_NUMBERING_PATTERN = "{PREFIX}/{SITE_CODE}/{YYYY}/{SEQ:4}";
const HIRADC_NUMBERING_PATTERN = "{PREFIX}/{SITE_CODE}/{YYYY}/{SEQ:4}";
const RISK_CORP_NUMBERING_PATTERN = "{PREFIX}/{YYYY}/{SEQ:3}";

const HIRA_WORKFLOW_NAME = "HIRA — 2/3 Level (Review Supervisor -> Approval HSE Manager -> [kondisional] Approval Company HSE Head)";
const JSA_WORKFLOW_NAME = "JSA — 2 Level (Review Supervisor -> Approval HSE Manager)";
const HIRADC_WORKFLOW_NAME = "HIRADC — 1 Level (Verifikasi Supervisor)";

// Task 3.2 — pola PERSIS DmsBootstrapService (2.1)/RegulatoryComplianceBootstrapService
// (2.2): numbering_configs (0.10) DAN workflow_definitions+stages+transitions
// (0.9) di-lazy-create PER TENANT saat pertama dibutuhkan (find-or-create
// idempotent), BUKAN disentuh dari ProvisioningService (gap TDD §26 sama
// persis). SATU service melayani KETIGA numbering_configs (HIRA/JSA/HIRADC/
// RISK_CORP module_code masing2 — PRD §5 "Numbering" tabel eksplisit
// menyebut 4 module_code TERPISAH walau seluruhnya bagian modul RISK yang
// SAMA) DAN KETIGA workflow_definitions (HIRA/JSA/HIRADC — risk_register
// TIDAK py workflow_instance_id di skema literal, BUKAN cakupan bootstrap
// ini).
@Injectable()
export class RiskWorkflowBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureNumberingConfig(moduleCode: string, pattern: string, prefix: string): Promise<NumberingConfig> {
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode, scopeId: null } });
      if (existing) return existing;

      return tx.numberingConfig.create({
        data: { tenantId, moduleCode, pattern, prefix, resetPeriod: "YEARLY", scopeLevel: "TENANT", scopeId: null },
      });
    });
  }

  async ensureHiraNumberingConfig(): Promise<NumberingConfig> {
    return this.ensureNumberingConfig("HIRA", HIRA_NUMBERING_PATTERN, "HIRA");
  }

  async ensureJsaNumberingConfig(): Promise<NumberingConfig> {
    return this.ensureNumberingConfig("JSA", JSA_NUMBERING_PATTERN, "JSA");
  }

  async ensureHiradcNumberingConfig(): Promise<NumberingConfig> {
    return this.ensureNumberingConfig("HIRADC", HIRADC_NUMBERING_PATTERN, "HRDC");
  }

  async ensureRiskCorpNumberingConfig(): Promise<NumberingConfig> {
    return this.ensureNumberingConfig("RISK_CORP", RISK_CORP_NUMBERING_PATTERN, "RISK");
  }

  private async findRoleOrThrow(tx: Prisma.TransactionClient, roleCode: string) {
    const role = await tx.role.findFirst({ where: { tenantId: null, roleCode } });
    if (!role) {
      throw new NotFoundException(
        `Role sistem "${roleCode}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Risk Management bisa membuat workflow_definitions default.`,
      );
    }
    return role;
  }

  /**
   * PRD §4.1 poin 2/3 — "template default disarankan 'HIRA — Review
   * Supervisor + Approval HSE Manager' (2 stage, SLA 3 hari/stage)."
   * Percabangan kondisional (poin 3): "jika ada hira_hazard_lines.risk_level_before
   * = EXTREME, sistem menambahkan stage 'Approval Top Management/Company
   * HSE Head'." KONSUMEN PERTAMA JSON Logic condition pada workflow_transitions
   * di seluruh codebase ini (0.9-3.1 SELALU condition=null/unconditional) —
   * DUA baris workflow_transitions dari stage2 dgn triggerAction SAMA
   * (APPROVE) tapi condition+priority BEDA: priority 0 (dicek LEBIH DULU)
   * mengecek contextData.hasExtremeHazard===true -> lanjut stage3; priority
   * 1 (fallback, condition=null=selalu match) -> langsung terminal APPROVED
   * kalau priority 0 TIDAK match. contextData.hasExtremeHazard DIISI
   * HiraAssessmentService.submitForApproval() SEBELUM startInstance()
   * (dihitung dari anyHazardLineRequiresEscalation(), hira-lifecycle.ts) —
   * workflow engine (0.9) TIDAK fetch data domain sendiri (jaga batas
   * modular monolith, lihat banner comment WorkflowInstance.contextData).
   * "Company HSE Head" TIDAK py role code literal tersendiri (TIDAK ADA
   * role TOP_MANAGEMENT, gap TDD §26, konsisten dgn keputusan 2.2/3.1
   * Modul 04/05 lain) — `COMPANY_ADMIN` dipakai sbg role PALING PLAUSIBLE
   * (otoritas company-wide existing terdekat).
   */
  async ensureHiraWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    const tenantId = requireTenantId();

    const existing = await tx.workflowDefinition.findFirst({
      where: { tenantId, moduleCode: RISK_MODULE_CODE, name: HIRA_WORKFLOW_NAME, isActive: true },
      orderBy: { version: "desc" },
    });
    if (existing) return existing;

    const supervisorRole = await this.findRoleOrThrow(tx, "SUPERVISOR");
    const hseManagerRole = await this.findRoleOrThrow(tx, "HSE_MANAGER");
    const companyAdminRole = await this.findRoleOrThrow(tx, "COMPANY_ADMIN");

    const definition = await tx.workflowDefinition.create({
      data: { tenantId, moduleCode: RISK_MODULE_CODE, name: HIRA_WORKFLOW_NAME, isActive: true, version: 1 },
    });

    const stage1 = await tx.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 1,
        stageName: "Review Supervisor",
        approverType: "ROLE_IN_SCOPE",
        approverRoleId: supervisorRole.id,
        slaHours: RISK_STAGE_SLA_HOURS,
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
        slaHours: RISK_STAGE_SLA_HOURS,
        escalationAction: "NOTIFY_SUPERIOR",
        allowDelegation: true,
      },
    });
    const stage3 = await tx.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 3,
        stageName: "Approval Company HSE Head (risiko EXTREME)",
        approverType: "ROLE_IN_SCOPE",
        approverRoleId: companyAdminRole.id,
        slaHours: RISK_STAGE_SLA_HOURS,
        escalationAction: "NOTIFY_SUPERIOR",
        allowDelegation: true,
      },
    });

    await tx.workflowTransition.createMany({
      data: [
        { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: stage2.id, triggerAction: "APPROVE", priority: 0 },
        { tenantId, workflowDefinitionId: definition.id, fromStageId: stage1.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED", priority: 0 },
        // Percabangan kondisional — priority 0 dicek LEBIH DULU (EXTREME
        // -> stage3), priority 1 fallback (tidak ada EXTREME -> terminal
        // APPROVED langsung).
        {
          tenantId,
          workflowDefinitionId: definition.id,
          fromStageId: stage2.id,
          toStageId: stage3.id,
          triggerAction: "APPROVE",
          condition: { "==": [{ var: "hasExtremeHazard" }, true] },
          priority: 0,
        },
        { tenantId, workflowDefinitionId: definition.id, fromStageId: stage2.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED", priority: 1 },
        { tenantId, workflowDefinitionId: definition.id, fromStageId: stage2.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED", priority: 0 },
        { tenantId, workflowDefinitionId: definition.id, fromStageId: stage3.id, toStageId: null, triggerAction: "APPROVE", resultStatus: "APPROVED", priority: 0 },
        { tenantId, workflowDefinitionId: definition.id, fromStageId: stage3.id, toStageId: null, triggerAction: "REJECT", resultStatus: "REJECTED", priority: 0 },
      ],
    });

    return definition;
  }

  /**
   * PRD §4.2 poin 2 — "template default: 1-2 stage (Supervisor -> HSE
   * Officer/Manager, SLA 1-2 hari)." Dipilih 2-stage (bukan 1) — JSA
   * dibuat oleh HSE Officer/Supervisor sendiri (PRD §3), approval dari
   * role LAIN/lebih senior lebih masuk akal drpd self-review; HSE_MANAGER
   * (bukan HSE_OFFICER) dipakai sbg approver akhir krn HSE_OFFICER sendiri
   * PLAUSIBLE jadi pembuat JSA (approve-sendiri tidak masuk akal).
   */
  async ensureJsaWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    const tenantId = requireTenantId();

    const existing = await tx.workflowDefinition.findFirst({
      where: { tenantId, moduleCode: RISK_MODULE_CODE, name: JSA_WORKFLOW_NAME, isActive: true },
      orderBy: { version: "desc" },
    });
    if (existing) return existing;

    const supervisorRole = await this.findRoleOrThrow(tx, "SUPERVISOR");
    const hseManagerRole = await this.findRoleOrThrow(tx, "HSE_MANAGER");

    const definition = await tx.workflowDefinition.create({
      data: { tenantId, moduleCode: RISK_MODULE_CODE, name: JSA_WORKFLOW_NAME, isActive: true, version: 1 },
    });

    const stage1 = await tx.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 1,
        stageName: "Review Supervisor",
        approverType: "ROLE_IN_SCOPE",
        approverRoleId: supervisorRole.id,
        slaHours: JSA_STAGE_SLA_HOURS,
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
        slaHours: JSA_STAGE_SLA_HOURS,
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
   * PRD §4.3 poin 2 — "Approval RINGAN — disarankan 1 stage 'Verifikasi
   * Supervisor' (SLA singkat, hitungan jam)... bisa dikonfigurasi TANPA
   * approval formal (VERIFIED oleh pembuat sendiri) utk pekerjaan risiko
   * rendah rutin." Method ini HANYA mendefinisikan workflow-nya — KEPUTUSAN
   * pakai jalur workflow vs self-verify ada di HiradcRecordService.verify()
   * (task 3.2), caller yang menentukan, bukan bootstrap ini.
   */
  async ensureHiradcWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    const tenantId = requireTenantId();

    const existing = await tx.workflowDefinition.findFirst({
      where: { tenantId, moduleCode: RISK_MODULE_CODE, name: HIRADC_WORKFLOW_NAME, isActive: true },
      orderBy: { version: "desc" },
    });
    if (existing) return existing;

    const supervisorRole = await this.findRoleOrThrow(tx, "SUPERVISOR");

    const definition = await tx.workflowDefinition.create({
      data: { tenantId, moduleCode: RISK_MODULE_CODE, name: HIRADC_WORKFLOW_NAME, isActive: true, version: 1 },
    });

    const stage1 = await tx.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 1,
        stageName: "Verifikasi Supervisor",
        approverType: "ROLE_IN_SCOPE",
        approverRoleId: supervisorRole.id,
        slaHours: HIRADC_STAGE_SLA_HOURS,
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
