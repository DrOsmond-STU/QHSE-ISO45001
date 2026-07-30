import { Injectable } from "@nestjs/common";
import { EnvWasteType, EnvWasteUnitOfMeasure, WasteGenerationLog } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./environmental-context";

export interface CreateWasteGenerationLogInput {
  siteId: string;
  departmentId?: string;
  logDate: Date;
  wasteCode?: string;
  wasteName: string;
  wasteType: EnvWasteType;
  quantityGenerated: number;
  unitOfMeasure: EnvWasteUnitOfMeasure;
  storageLocation?: string;
  storageStartDate?: Date;
  maxStorageDurationDays?: number;
  cumulativeStoredQuantity?: number;
}

/**
 * Task 5.2 (Modul 12 §4.3 poin 1, §3 "TPS LB3 Officer/Waste Handler | environmental.waste_generation_log.create").
 * BELUM ada controller HTTP.
 */
@Injectable()
export class WasteGenerationLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWasteGenerationLogInput): Promise<WasteGenerationLog> {
    const recordedBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls((tx) =>
      tx.wasteGenerationLog.create({
        data: {
          tenantId,
          siteId: input.siteId,
          departmentId: input.departmentId,
          logDate: input.logDate,
          wasteCode: input.wasteCode,
          wasteName: input.wasteName,
          wasteType: input.wasteType,
          quantityGenerated: input.quantityGenerated,
          unitOfMeasure: input.unitOfMeasure,
          storageLocation: input.storageLocation,
          storageStartDate: input.storageStartDate,
          maxStorageDurationDays: input.maxStorageDurationDays,
          cumulativeStoredQuantity: input.cumulativeStoredQuantity,
          recordedBy,
          createdBy: recordedBy,
          updatedBy: recordedBy,
        },
      }),
    );
  }

  /** PRD §4.3 poin 2 — "waste_manifest_records mereferensikan akumulasi waste_generation_log terkait." */
  async linkToManifest(wasteGenerationLogId: string, wasteManifestId: string): Promise<WasteGenerationLog> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.wasteGenerationLog.update({ where: { id: wasteGenerationLogId }, data: { linkedWasteManifestId: wasteManifestId, updatedBy } }),
    );
  }

  /** Idempotency BR-03 (H-7 warning) — dipanggil waste-storage-duration-scan. */
  async markStorageDurationWarningSent(wasteGenerationLogId: string): Promise<WasteGenerationLog> {
    return this.prisma.withRls((tx) =>
      tx.wasteGenerationLog.update({ where: { id: wasteGenerationLogId }, data: { storageDurationWarningSentAt: new Date() } }),
    );
  }

  async getById(wasteGenerationLogId: string): Promise<WasteGenerationLog> {
    return this.prisma.withRls((tx) => tx.wasteGenerationLog.findUniqueOrThrow({ where: { id: wasteGenerationLogId } }));
  }

  async listBySite(siteId: string): Promise<WasteGenerationLog[]> {
    return this.prisma.withRls((tx) => tx.wasteGenerationLog.findMany({ where: { siteId }, orderBy: { logDate: "desc" } }));
  }
}
