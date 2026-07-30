import { Injectable, NotFoundException } from "@nestjs/common";
import { NumberingConfig, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireTenantId } from "./occupational-health-context";

// § Numbering — 2 numbering_configs module_code TERPISAH, keduanya SITE
// scope. clinic_visit_logs.visit_number ditulis "opsional" di PRD tapi
// TETAP disediakan numbering config-nya (dipanggil caller HANYA saat
// benar-benar butuh nomor, bukan wajib dipanggil tiap create).
const PAK_NUMBERING_MODULE_CODE = "OH_PAK";
const PAK_NUMBERING_PATTERN = "PAK/{SITE_CODE}/{YYYY}/{SEQ:4}";
const CLINIC_VISIT_NUMBERING_MODULE_CODE = "OH_CLINIC_VISIT";
const CLINIC_VISIT_NUMBERING_PATTERN = "CV/{SITE_CODE}/{YYYY}/{SEQ:5}";

// PRD §4.3 poin 5 — module_code=OH_PAK_CASE, stage (1) laporan awal OH
// Staff [BUKAN stage approval, itu aksi CREATE] -> (2) Physician konfirmasi
// diagnosis -> (3) HSE Manager review risiko sistemik -> (4)/(5) CAPA
// trigger/penutupan [aksi SISTEM pasca-approval, bukan stage tersendiri,
// pola sama WorkflowCompletionListener modul lain]. Diterjemahkan jadi
// WORKFLOW 2-STAGE (Physician confirm, HSE Manager review) — PRD TIDAK
// beri angka SLA sama sekali utk stage-stage ini (beda dari Environmental
// 4.1/Audit 4.1 yang eksplisit) — diinvent 120 jam (5 hari kerja), REUSE
// preseden default yang sudah dipakai berulang sesi ini (Audit "Approval
// Top Management", Environmental ASPECT_REVIEW kedua stage) drpd angka
// baru tanpa dasar, gap TDD §26. "Physician" dipetakan role
// OCCUPATIONAL_HEALTH_STAFF existing (PRD §1: dokter/paramedis klinik
// ADALAH staf ini, bukan role terpisah).
const PAK_CASE_MODULE_CODE = "OH_PAK_CASE";
const PAK_CASE_STAGE_SLA_HOURS = 120;
const PAK_CASE_WORKFLOW_NAME = "Occupational Disease Case (PAK) — Confirmation & Systemic Review — 2 Stage";

@Injectable()
export class OccupationalHealthWorkflowBootstrapService {
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

  async ensurePakNumberingConfig(siteId: string): Promise<NumberingConfig> {
    return this.ensureNumberingConfig(PAK_NUMBERING_MODULE_CODE, PAK_NUMBERING_PATTERN, siteId);
  }

  async ensureClinicVisitNumberingConfig(siteId: string): Promise<NumberingConfig> {
    return this.ensureNumberingConfig(CLINIC_VISIT_NUMBERING_MODULE_CODE, CLINIC_VISIT_NUMBERING_PATTERN, siteId);
  }

  private async findRoleOrThrow(tx: Prisma.TransactionClient, roleCode: string) {
    const role = await tx.role.findFirst({ where: { tenantId: null, roleCode } });
    if (!role) {
      throw new NotFoundException(
        `Role sistem "${roleCode}" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Occupational Health bisa membuat workflow_definitions default.`,
      );
    }
    return role;
  }

  async ensurePakCaseWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    return this.ensureTwoStageDefinition(tx, PAK_CASE_MODULE_CODE, PAK_CASE_WORKFLOW_NAME, [
      { stageName: "Konfirmasi Diagnosis oleh Physician", roleCode: "OCCUPATIONAL_HEALTH_STAFF", slaHours: PAK_CASE_STAGE_SLA_HOURS },
      { stageName: "Review Risiko Sistemik oleh HSE Manager", roleCode: "HSE_MANAGER", slaHours: PAK_CASE_STAGE_SLA_HOURS },
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
