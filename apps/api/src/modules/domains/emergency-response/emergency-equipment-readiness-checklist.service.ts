import { Injectable } from "@nestjs/common";
import { EmergencyEquipmentReadinessChecklist, EquipmentReadinessStatus } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./emergency-response-context";

export interface CreateEmergencyEquipmentReadinessChecklistInput {
  siteId: string;
  assetId: string;
  inspectionDate: Date;
  readinessStatus: EquipmentReadinessStatus;
  issueDescription?: string;
  capaId?: string;
  linkedMaintenanceRecordId?: string;
  nextCheckDueDate?: Date;
}

/**
 * Task 3.7 (Modul 14 §4.5/§6 BR-06). BELUM ada controller HTTP.
 *
 * BR-06 poin 1 — "asset_id wajib merujuk pada assets.is_safety_critical=TRUE
 * (Modul 15)" TIDAK BISA ditegakkan — Modul 15 (Asset & Equipment
 * Management) BELUM ADA di codebase ini (task 6.1, Phase 6) — assetId
 * bare UUID TANPA FK sama sekali (lihat banner comment schema.prisma),
 * jadi validasi silang "genuinely aset kritis" mustahil dilakukan
 * sekarang, gap TDD §26.
 *
 * BR-06 poin 2 — "readiness_status=OUT_OF_SERVICE pada alat kritis wajib
 * memicu notifikasi eskalasi REAL-TIME ke HSE Manager & Site Manager
 * (TIDAK menunggu siklus laporan berkala)" — DIIMPLEMENTASIKAN sinkron
 * DI DALAM create() (bukan scan job terpisah, sesuai "real-time" literal).
 * "Site Manager" TIDAK ADA sbg role di roster 15-role baseline (§3 modul
 * ini SENDIRI juga tidak memberi permission_code apa pun ke persona itu)
 * — eskalasi HANYA ke HSE_MANAGER, gap TDD §26.
 */
@Injectable()
export class EmergencyEquipmentReadinessChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(input: CreateEmergencyEquipmentReadinessChecklistInput): Promise<EmergencyEquipmentReadinessChecklist> {
    const checkedBy = requireActorUserId();
    const tenantId = requireTenantId();

    const checklist = await this.prisma.withRls((tx) =>
      tx.emergencyEquipmentReadinessChecklist.create({
        data: {
          tenantId,
          siteId: input.siteId,
          assetId: input.assetId,
          inspectionDate: input.inspectionDate,
          checkedBy,
          readinessStatus: input.readinessStatus,
          issueDescription: input.issueDescription,
          capaId: input.capaId,
          linkedMaintenanceRecordId: input.linkedMaintenanceRecordId,
          nextCheckDueDate: input.nextCheckDueDate,
          createdBy: checkedBy,
          updatedBy: checkedBy,
        },
      }),
    );

    if (checklist.readinessStatus === "OUT_OF_SERVICE") {
      await this.escalateOutOfService(checklist);
    }

    return checklist;
  }

  private async escalateOutOfService(checklist: EmergencyEquipmentReadinessChecklist): Promise<void> {
    const tenantId = requireTenantId();
    const hseManagers = await this.prisma.withRls((tx) =>
      tx.user.findMany({
        where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
        select: { id: true },
      }),
    );

    for (const manager of hseManagers) {
      await this.notificationService.enqueue({
        eventType: "EMERGENCY_EQUIPMENT_OUT_OF_SERVICE",
        entityType: "EMERGENCY_EQUIPMENT_READINESS_CHECKLIST",
        entityId: checklist.id,
        recipientUserId: manager.id,
        priority: "HIGH",
        eventCategory: "EMERGENCY_RESPONSE",
        variables: { assetId: checklist.assetId },
      });
    }
  }

  async getById(readinessChecklistId: string): Promise<EmergencyEquipmentReadinessChecklist> {
    return this.prisma.withRls((tx) => tx.emergencyEquipmentReadinessChecklist.findUniqueOrThrow({ where: { id: readinessChecklistId } }));
  }

  async listBySite(siteId: string): Promise<EmergencyEquipmentReadinessChecklist[]> {
    return this.prisma.withRls((tx) =>
      tx.emergencyEquipmentReadinessChecklist.findMany({ where: { siteId, deletedAt: null }, orderBy: { inspectionDate: "desc" } }),
    );
  }
}
