import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Asset, AssetTransferLog, Prisma, WorkflowDefinition } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { WorkflowEngineService } from "../../../platform/workflow-engine/workflow-engine.service";
import { AssetService } from "./asset.service";
import { requireActorUserId, requireTenantId } from "./asset-equipment-context";
import { requiresDisposalWorkflow } from "./asset-lifecycle";

// PRD §4.3 "dapat dikonfigurasi memakainya jika tenant memerlukan approval
// utk disposal aset bernilai tinggi (opsional, requires_disposal_approval
// di kategori)" — TIDAK ada baris §4 workflow_definitions default utk ini
// (BEDA seluruh modul lain sesi ini yang selalu py tabel konfigurasi
// eksplisit), approver "Top Management"-tier diinvent COMPANY_ADMIN, pola
// SAMA preseden Audit 4.1/CAPA/Emergency Response/Environmental utk
// keputusan bernilai organisasional — gap TDD §26.
const DISPOSAL_WORKFLOW_MODULE_CODE = "ASSET_DISPOSAL";
const DISPOSAL_WORKFLOW_NAME = "Asset Disposal Approval — 1 Stage (Company Admin)";
const DISPOSAL_STAGE_SLA_HOURS = 120;
export const DISPOSAL_WORKFLOW_ENTITY_TYPE = "asset";

// BEYOND task 6.1 asli — ditambah RETROAKTIF task 6.2 (Calibration
// Management) utk BR-08 Modul 16 ("perubahan assets.site_id wajib memicu
// sinkronisasi calibration_items.site_id, event-driven"). Perubahan ADITIF
// murni (emit() baru, tidak mengubah baris kode yg sudah ada) — pola sama
// stub event lintas-modul lain sesi ini (mis. audit.finding_capa_required
// 4.1 diantisipasi CAPA 4.2). TIDAK ADA konsumen SAMA SEKALI sebelum modul
// ini genuinely ada, aman di-emit ke "void".
export const ASSET_SITE_CHANGED_EVENT = "asset.site_changed";
export interface AssetSiteChangedEvent {
  tenantId: string;
  assetId: string;
  newSiteId: string;
}

export interface TransferAssetInput {
  assetId: string;
  toSiteId: string;
  transferDate: Date;
  reason?: string;
  requestedBy?: string;
  approvedBy?: string;
}

@Injectable()
export class AssetTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetService: AssetService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async transfer(input: TransferAssetInput): Promise<AssetTransferLog> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    const asset = await this.prisma.withRls((tx) => tx.asset.findUniqueOrThrow({ where: { id: input.assetId } }));

    const log = await this.prisma.withRls((tx) =>
      tx.assetTransferLog.create({
        data: {
          tenantId,
          assetId: input.assetId,
          fromSiteId: asset.siteId,
          toSiteId: input.toSiteId,
          transferDate: input.transferDate,
          reason: input.reason,
          requestedBy: input.requestedBy,
          approvedBy: input.approvedBy,
          createdBy: actorUserId,
        },
      }),
    );

    // BR "tidak mengubah histori maintenance sebelumnya" (PRD §4.3) —
    // maintenance_schedules/maintenance_records TIDAK disentuh sama sekali,
    // hanya assets.site_id berpindah.
    await this.prisma.withRls((tx) => tx.asset.update({ where: { id: input.assetId }, data: { siteId: input.toSiteId, updatedBy: actorUserId } }));

    // BR-08 Modul 16 (task 6.2, ditambah retroaktif) — lihat banner comment
    // ASSET_SITE_CHANGED_EVENT di atas.
    this.eventEmitter.emit(ASSET_SITE_CHANGED_EVENT, { tenantId, assetId: input.assetId, newSiteId: input.toSiteId } satisfies AssetSiteChangedEvent);

    return log;
  }

  async retire(assetId: string): Promise<Asset> {
    const actorUserId = requireActorUserId();
    const asset = await this.prisma.withRls((tx) =>
      tx.asset.update({ where: { id: assetId }, data: { lifecycleStatus: "RETIRED", updatedBy: actorUserId } }),
    );
    // BR-01 — RETIRED TIDAK digate BR-03 (hanya DISPOSED), langsung nonaktifkan jadwal.
    await this.assetService.deactivateSchedulesIfTerminal(assetId, "RETIRED");
    return asset;
  }

  /** BR-03 — disposal langsung kalau kategori TIDAK mewajibkan approval,
   * ATAU mulai Workflow Engine (status TETAP belum DISPOSED sampai
   * disetujui) kalau kategori mewajibkannya. */
  async requestDisposal(assetId: string): Promise<Asset> {
    const actorUserId = requireActorUserId();
    const asset = await this.prisma.withRls((tx) => tx.asset.findUniqueOrThrow({ where: { id: assetId } }));
    const category = await this.prisma.withRls((tx) => tx.assetCategory.findUniqueOrThrow({ where: { id: asset.assetCategoryId } }));

    if (!requiresDisposalWorkflow("DISPOSED", category.requiresDisposalApproval)) {
      const disposed = await this.prisma.withRls((tx) =>
        tx.asset.update({ where: { id: assetId }, data: { lifecycleStatus: "DISPOSED", updatedBy: actorUserId } }),
      );
      await this.assetService.deactivateSchedulesIfTerminal(assetId, "DISPOSED");
      return disposed;
    }

    const definition = await this.prisma.withRls((tx) => this.ensureDisposalWorkflowDefinition(tx));
    const instance = await this.workflowEngine.startInstance(DISPOSAL_WORKFLOW_ENTITY_TYPE, assetId, definition.id, {
      assetCode: asset.assetCode,
      assetName: asset.assetName,
    });

    return this.prisma.withRls((tx) =>
      tx.asset.update({ where: { id: assetId }, data: { disposalWorkflowInstanceId: instance.id, updatedBy: actorUserId } }),
    );
  }

  /** Dipanggil AssetDisposalWorkflowCompletionListener. APPROVED -> DISPOSED
   * + nonaktifkan jadwal (BR-01). REJECTED -> lifecycle_status TIDAK
   * berubah (tetap ACTIVE/apa pun sebelumnya) — disposalWorkflowInstanceId
   * TIDAK di-null-kan (pointer sekali-pakai historis, lihat banner comment
   * schema.prisma), caller yang ingin coba lagi memanggil requestDisposal()
   * ULANG (instance BARU, menimpa pointer lama). */
  async onDisposalWorkflowCompleted(assetId: string, approved: boolean): Promise<void> {
    if (!approved) return;
    await this.prisma.withRls((tx) => tx.asset.update({ where: { id: assetId }, data: { lifecycleStatus: "DISPOSED" } }));
    await this.assetService.deactivateSchedulesIfTerminal(assetId, "DISPOSED");
  }

  private async ensureDisposalWorkflowDefinition(tx: Prisma.TransactionClient): Promise<WorkflowDefinition> {
    const tenantId = requireTenantId();

    const existing = await tx.workflowDefinition.findFirst({
      where: { tenantId, moduleCode: DISPOSAL_WORKFLOW_MODULE_CODE, isActive: true },
      orderBy: { version: "desc" },
    });
    if (existing) return existing;

    const companyAdminRole = await tx.role.findFirst({ where: { tenantId: null, roleCode: "COMPANY_ADMIN" } });
    if (!companyAdminRole) {
      throw new NotFoundException(
        'Role sistem "COMPANY_ADMIN" tidak ditemukan — RBAC baseline (seed-rbac-baseline.ts) wajib dijalankan sebelum modul Asset bisa membuat workflow_definitions disposal.',
      );
    }

    const definition = await tx.workflowDefinition.create({
      data: { tenantId, moduleCode: DISPOSAL_WORKFLOW_MODULE_CODE, name: DISPOSAL_WORKFLOW_NAME, isActive: true, version: 1 },
    });

    const stage1 = await tx.workflowStage.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        sequenceNo: 1,
        stageName: "Disposal Approval",
        approverType: "ROLE_IN_SCOPE",
        approverRoleId: companyAdminRole.id,
        slaHours: DISPOSAL_STAGE_SLA_HOURS,
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
