import { Injectable } from "@nestjs/common";
import { EmergencyMusterPoint } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./emergency-response-context";

export interface CreateEmergencyMusterPointInput {
  siteId: string;
  musterPointCode: string;
  musterPointName: string;
  locationDescription?: string;
  gpsLat?: number;
  gpsLong?: number;
  capacityEstimate?: number;
}

// Task 3.7 (Modul 14 §5) — master titik kumpul, referensi bagi plan/drill/
// check-in (PRD §5 "diperlukan sbg referensi"). BELUM ada controller HTTP
// (pola sama seluruh modul domain Phase 2+).
@Injectable()
export class EmergencyMusterPointService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateEmergencyMusterPointInput): Promise<EmergencyMusterPoint> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.emergencyMusterPoint.create({
        data: {
          tenantId,
          siteId: input.siteId,
          musterPointCode: input.musterPointCode,
          musterPointName: input.musterPointName,
          locationDescription: input.locationDescription,
          gpsLat: input.gpsLat,
          gpsLong: input.gpsLong,
          capacityEstimate: input.capacityEstimate,
          isActive: true,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async getById(musterPointId: string): Promise<EmergencyMusterPoint> {
    return this.prisma.withRls((tx) => tx.emergencyMusterPoint.findUniqueOrThrow({ where: { id: musterPointId } }));
  }

  async listActiveBySite(siteId: string): Promise<EmergencyMusterPoint[]> {
    return this.prisma.withRls((tx) =>
      tx.emergencyMusterPoint.findMany({ where: { siteId, isActive: true, deletedAt: null }, orderBy: { musterPointName: "asc" } }),
    );
  }

  async deactivate(musterPointId: string): Promise<EmergencyMusterPoint> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.emergencyMusterPoint.update({ where: { id: musterPointId }, data: { isActive: false, updatedBy } }),
    );
  }
}
