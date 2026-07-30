import { BadRequestException, Injectable } from "@nestjs/common";
import { Asset, AssetConditionStatus, AssetLifecycleStatus, NumberingConfig } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./asset-equipment-context";
import {
  isSafetyCriticalNewlyFlagged,
  isSafetyCriticalOutOfServiceAlertRequired,
  requiresDisposalWorkflow,
  shouldDeactivateSchedulesOnLifecycleChange,
} from "./asset-lifecycle";

const ASSET_NUMBERING_MODULE_CODE = "ASSET";
const ASSET_NUMBERING_PATTERN = "AST/{SITE_CODE}/{YYYY}/{SEQ:4}";

export interface CreateAssetInput {
  siteId: string;
  departmentId?: string;
  assetCategoryId: string;
  assetName: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  isSafetyCritical?: boolean;
  customFields?: unknown;
}

export interface UpdateAssetInput {
  departmentId?: string;
  assetName?: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  isSafetyCritical?: boolean;
  conditionStatus?: AssetConditionStatus;
  customFields?: unknown;
}

@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
    private readonly notificationService: NotificationService,
  ) {}

  async ensureNumberingConfig(siteId: string): Promise<NumberingConfig> {
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const existing = await tx.numberingConfig.findFirst({ where: { tenantId, moduleCode: ASSET_NUMBERING_MODULE_CODE, scopeId: siteId } });
      if (existing) return existing;
      return tx.numberingConfig.create({
        data: { tenantId, moduleCode: ASSET_NUMBERING_MODULE_CODE, pattern: ASSET_NUMBERING_PATTERN, prefix: "AST", resetPeriod: "YEARLY", scopeLevel: "SITE", scopeId: siteId },
      });
    });
  }

  async create(input: CreateAssetInput): Promise<Asset> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    await this.ensureNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
    const assetCode = await this.numbering.generateNext(ASSET_NUMBERING_MODULE_CODE, {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    const category = await this.prisma.withRls((tx) => tx.assetCategory.findUniqueOrThrow({ where: { id: input.assetCategoryId } }));
    const isSafetyCritical = input.isSafetyCritical ?? category.defaultIsSafetyCritical;

    const asset = await this.prisma.withRls((tx) =>
      tx.asset.create({
        data: {
          tenantId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          assetCategoryId: input.assetCategoryId,
          assetCode,
          assetName: input.assetName,
          manufacturer: input.manufacturer,
          modelNumber: input.modelNumber,
          serialNumber: input.serialNumber,
          purchaseDate: input.purchaseDate,
          isSafetyCritical,
          customFields: input.customFields ?? undefined,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );

    // BR-02 — is_safety_critical SUDAH true SEJAK create() (bukan transisi
    // false->true) TIDAK memicu notifikasi (PRD §6 literal "perubahan ...
    // dari false menjadi true", create() bukan "perubahan").
    return asset;
  }

  async update(id: string, input: UpdateAssetInput): Promise<Asset> {
    const actorUserId = requireActorUserId();
    const existing = await this.prisma.withRls((tx) => tx.asset.findUniqueOrThrow({ where: { id } }));

    const asset = await this.prisma.withRls((tx) =>
      tx.asset.update({
        where: { id },
        data: {
          departmentId: input.departmentId,
          assetName: input.assetName,
          manufacturer: input.manufacturer,
          modelNumber: input.modelNumber,
          serialNumber: input.serialNumber,
          isSafetyCritical: input.isSafetyCritical,
          conditionStatus: input.conditionStatus,
          customFields: input.customFields ?? undefined,
          updatedBy: actorUserId,
        },
      }),
    );

    if (input.isSafetyCritical !== undefined && isSafetyCriticalNewlyFlagged(existing.isSafetyCritical, input.isSafetyCritical)) {
      await this.notifyHseManagers(asset, "ASSET_EQUIPMENT_SAFETY_CRITICAL_FLAGGED");
    }

    // BR-04 — PRD §6 tidak membatasi jalur "condition_status=OUT_OF_SERVICE"
    // hanya lewat MaintenanceRecordService; update() manual JUGA menulis
    // condition_status langsung (UpdateAssetInput), jadi wajib alert sama
    // seperti MaintenanceRecordService.create() (unconditional per write,
    // bukan transition-check — lihat isSafetyCriticalOutOfServiceAlertRequired).
    if (input.conditionStatus !== undefined) {
      await this.alertIfOutOfServiceSafetyCritical(asset);
    }

    return asset;
  }

  // BR-01 — dipanggil AssetTransferService.retire()/dispose() (task 6.1
  // lanjutan) SETELAH lifecycle_status benar-benar berubah (bukan di sini —
  // AssetService.update() SENGAJA TIDAK mengekspos lifecycle_status sama
  // sekali, lihat komentar UpdateAssetInput: perubahan lifecycle WAJIB lewat
  // AssetTransferService supaya BR-03 [disposal via Workflow Engine] tidak
  // bisa dilewati caller yang keliru memakai method generik ini).
  async deactivateSchedulesIfTerminal(assetId: string, newStatus: AssetLifecycleStatus): Promise<void> {
    if (!shouldDeactivateSchedulesOnLifecycleChange(newStatus)) return;
    const tenantId = requireTenantId();
    await this.prisma.withRls((tx) =>
      tx.maintenanceSchedule.updateMany({ where: { tenantId, assetId, isActive: true }, data: { isActive: false } }),
    );
  }

  assertDisposalAllowedDirectly(categoryRequiresDisposalApproval: boolean, newStatus: AssetLifecycleStatus): void {
    if (requiresDisposalWorkflow(newStatus, categoryRequiresDisposalApproval)) {
      throw new BadRequestException(
        "Disposal aset kategori ini wajib melalui alur persetujuan (BR-03) — panggil AssetTransferService.requestDisposal(), bukan update status langsung.",
      );
    }
  }

  // BR-04 — condition_status=OUT_OF_SERVICE pada aset safety-critical wajib
  // alert prioritas tinggi. Dipanggil MaintenanceRecordService setelah
  // menulis result_condition (satu-satunya jalur condition_status berubah
  // selain update() manual di atas, yang JUGA memanggil ini).
  async alertIfOutOfServiceSafetyCritical(asset: Asset): Promise<void> {
    if (!isSafetyCriticalOutOfServiceAlertRequired(asset.isSafetyCritical, asset.conditionStatus)) return;
    await this.notifyHseManagers(asset, "ASSET_EQUIPMENT_SAFETY_CRITICAL_OUT_OF_SERVICE");
  }

  private async notifyHseManagers(asset: Asset, eventType: string): Promise<void> {
    const tenantId = requireTenantId();
    const recipients = await this.prisma.withRls((tx) =>
      tx.user.findMany({
        where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
        select: { id: true },
      }),
    );
    for (const recipient of recipients) {
      await this.notificationService.enqueue({
        eventType,
        entityType: "ASSET",
        entityId: asset.id,
        recipientUserId: recipient.id,
        priority: "HIGH",
        eventCategory: "ASSET_EQUIPMENT",
        variables: { assetName: asset.assetName, assetCode: asset.assetCode },
      });
    }
  }
}
