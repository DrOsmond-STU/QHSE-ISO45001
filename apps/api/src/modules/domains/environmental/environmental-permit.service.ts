import { Injectable } from "@nestjs/common";
import { EnvironmentalPermit, EnvPermitMedia, EnvPermitMonitoringFrequency, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./environmental-context";

export interface CreateEnvironmentalPermitInput {
  licensePermitId: string;
  permitMedia: EnvPermitMedia;
  requiredMonitoringParameters?: Prisma.InputJsonValue;
  requiredMonitoringFrequency?: EnvPermitMonitoringFrequency;
  reportingObligationTo?: string;
}

/**
 * Task 5.2 (Modul 12 §5, BR-05 — 1:1 ekstensi `licenses_permits` Modul 04).
 * BELUM ada controller HTTP. Validasi `licensePermitId` via QUERY PRISMA
 * LANGSUNG ke `licenses_permits` (pola sama `assertSourceValidIfKnownContract()`
 * CAPA 4.2/5.1) — TIDAK mengimpor RegulatoryComplianceModule (arah
 * dependency: Prisma schema shared resource, NestJS module boundary bukan
 * soal per-tabel ownership, lihat memory project-qhse-dev-conventions.md
 * "Module layering rule").
 */
@Injectable()
export class EnvironmentalPermitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateEnvironmentalPermitInput): Promise<EnvironmentalPermit> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    // BR-05 — pastikan licenses_permits genuinely ada (RLS-scoped, jadi
    // otomatis gagal kalau licensePermitId milik tenant lain).
    await this.prisma.withRls((tx) => tx.licensePermit.findUniqueOrThrow({ where: { id: input.licensePermitId } }));

    return this.prisma.withRls((tx) =>
      tx.environmentalPermit.create({
        data: {
          tenantId,
          licensePermitId: input.licensePermitId,
          permitMedia: input.permitMedia,
          requiredMonitoringParameters: input.requiredMonitoringParameters,
          requiredMonitoringFrequency: input.requiredMonitoringFrequency,
          reportingObligationTo: input.reportingObligationTo,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async recordReportSubmitted(environmentalPermitId: string): Promise<EnvironmentalPermit> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.environmentalPermit.update({ where: { id: environmentalPermitId }, data: { lastReportSubmittedDate: new Date(), updatedBy } }),
    );
  }

  async getById(environmentalPermitId: string): Promise<EnvironmentalPermit> {
    return this.prisma.withRls((tx) => tx.environmentalPermit.findUniqueOrThrow({ where: { id: environmentalPermitId } }));
  }

  async getByLicensePermitId(licensePermitId: string): Promise<EnvironmentalPermit | null> {
    return this.prisma.withRls((tx) => tx.environmentalPermit.findUnique({ where: { licensePermitId } }));
  }
}
