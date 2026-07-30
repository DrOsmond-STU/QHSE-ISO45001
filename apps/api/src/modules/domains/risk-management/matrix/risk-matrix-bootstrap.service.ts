import { Injectable } from "@nestjs/common";
import { RiskMatrixConfig, RiskMatrixModuleScope } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { buildDefaultRiskMatrixCells, buildDefaultRiskMatrixLevels } from "./default-risk-matrix";
import { requireActorUserId, requireTenantId } from "./risk-matrix-context";

const DEFAULT_MATRIX_NAME = "Matriks Risiko K3 Standar 5x5";

// Task 3.1 — pola PERSIS DmsBootstrapService (2.1)/RegulatoryComplianceBootstrapService
// (2.2): lazy-create find-or-create idempotent, dipanggil begitu tenant
// PERTAMA KALI butuh matriks utk scope tertentu (task 3.2, saat HIRA/JSA/
// HIRADC/risk_register pertama dibuat) — BUKAN dipanggil dari
// ProvisioningService (1.5), pola konsisten sejak 2.1/2.2 (gap TDD §26,
// di luar timebox menyentuh ulang orkestrasi Phase 1 yang sudah shipped).
@Injectable()
export class RiskMatrixBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultMatrix(scope: RiskMatrixModuleScope = "ALL"): Promise<RiskMatrixConfig> {
    const tenantId = requireTenantId();
    const createdBy = requireActorUserId();

    return this.prisma.withRls(async (tx) => {
      const existing = await tx.riskMatrixConfig.findFirst({
        where: { tenantId, applicableModuleScope: scope, isActive: true },
      });
      if (existing) return existing;

      const config = await tx.riskMatrixConfig.create({
        data: {
          tenantId,
          name: DEFAULT_MATRIX_NAME,
          applicableModuleScope: scope,
          likelihoodLevels: 5,
          severityLevels: 5,
          version: 1,
          isActive: true,
          createdBy,
          updatedBy: createdBy,
        },
      });

      await tx.riskMatrixLevel.createMany({
        data: buildDefaultRiskMatrixLevels().map((l) => ({ tenantId, riskMatrixConfigId: config.id, ...l })),
      });
      await tx.riskMatrixCell.createMany({
        data: buildDefaultRiskMatrixCells().map((c) => ({ tenantId, riskMatrixConfigId: config.id, ...c })),
      });

      return config;
    });
  }
}
