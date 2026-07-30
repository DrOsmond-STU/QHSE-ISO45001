import { Injectable } from "@nestjs/common";
import { CalibrationItem, CalibrationItemStatus } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./calibration-context";

export interface CreateCalibrationItemInput {
  assetId: string;
  departmentId?: string;
  measurementParameter: string;
  measurementRangeMin?: number;
  measurementRangeMax?: number;
  measurementRangeUnit?: string;
  accuracyClass?: string;
  resolution?: string;
  calibrationIntervalMonths: number;
  calibrationMethodStandard?: string;
  isCriticalMeasurement?: boolean;
}

export interface UpdateCalibrationItemInput {
  departmentId?: string;
  measurementParameter?: string;
  measurementRangeMin?: number;
  measurementRangeMax?: number;
  measurementRangeUnit?: string;
  accuracyClass?: string;
  resolution?: string;
  calibrationIntervalMonths?: number;
  calibrationMethodStandard?: string;
  isCriticalMeasurement?: boolean;
  calibrationStatus?: CalibrationItemStatus;
}

@Injectable()
export class CalibrationItemService {
  constructor(private readonly prisma: PrismaService) {}

  // BR-01 — asset hanya boleh py 1 calibration_items (TERPENUHI BY
  // CONSTRUCTION via @unique(assetId), lihat banner comment schema.prisma
  // blok Modul 16) — P2002 dari Prisma dibiarkan propagate apa adanya kalau
  // caller mencoba dobel, tidak perlu pre-check terpisah yang bisa race.
  async create(input: CreateCalibrationItemInput): Promise<CalibrationItem> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    const asset = await this.prisma.withRls((tx) =>
      tx.asset.findUniqueOrThrow({ where: { id: input.assetId }, select: { siteId: true, assetCode: true, isSafetyCritical: true } }),
    );

    return this.prisma.withRls((tx) =>
      tx.calibrationItem.create({
        data: {
          tenantId,
          assetId: input.assetId,
          siteId: asset.siteId,
          departmentId: input.departmentId,
          // Didenormalisasi dari assets.assetCode — lihat banner comment
          // schema.prisma poin (4).
          equipmentTagNo: asset.assetCode,
          measurementParameter: input.measurementParameter,
          measurementRangeMin: input.measurementRangeMin,
          measurementRangeMax: input.measurementRangeMax,
          measurementRangeUnit: input.measurementRangeUnit,
          accuracyClass: input.accuracyClass,
          resolution: input.resolution,
          calibrationIntervalMonths: input.calibrationIntervalMonths,
          calibrationMethodStandard: input.calibrationMethodStandard,
          // PRD §5 — default dari assets.is_safety_critical, dapat di-override manual.
          isCriticalMeasurement: input.isCriticalMeasurement ?? asset.isSafetyCritical,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async update(id: string, input: UpdateCalibrationItemInput): Promise<CalibrationItem> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.calibrationItem.update({
        where: { id },
        data: {
          departmentId: input.departmentId,
          measurementParameter: input.measurementParameter,
          measurementRangeMin: input.measurementRangeMin,
          measurementRangeMax: input.measurementRangeMax,
          measurementRangeUnit: input.measurementRangeUnit,
          accuracyClass: input.accuracyClass,
          resolution: input.resolution,
          calibrationIntervalMonths: input.calibrationIntervalMonths,
          calibrationMethodStandard: input.calibrationMethodStandard,
          isCriticalMeasurement: input.isCriticalMeasurement,
          calibrationStatus: input.calibrationStatus,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async getById(id: string): Promise<CalibrationItem> {
    return this.prisma.withRls((tx) => tx.calibrationItem.findUniqueOrThrow({ where: { id } }));
  }

  async list(): Promise<CalibrationItem[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.calibrationItem.findMany({ where: { tenantId, deletedAt: null }, orderBy: { equipmentTagNo: "asc" } }));
  }

  // BR-08 — dipanggil AssetSiteChangeListener (event ASSET_SITE_CHANGED_EVENT,
  // ditambahkan retroaktif ke AssetTransferService.transfer() 6.1) begitu
  // lokasi assets.site_id berubah, lihat banner comment schema.prisma poin (2).
  async syncSiteId(assetId: string, newSiteId: string): Promise<void> {
    const tenantId = requireTenantId();
    await this.prisma.withRls((tx) => tx.calibrationItem.updateMany({ where: { tenantId, assetId }, data: { siteId: newSiteId } }));
  }
}
