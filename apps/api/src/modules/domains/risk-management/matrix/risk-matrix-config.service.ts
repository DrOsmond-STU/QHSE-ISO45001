import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { RiskMatrixAxis, RiskMatrixConfig, RiskMatrixLevel, RiskMatrixCell, RiskMatrixModuleScope } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId, withCleanUniqueViolation } from "./risk-matrix-context";

export interface RiskMatrixLevelInput {
  axis: RiskMatrixAxis;
  levelValue: number;
  label: string;
  description?: string;
}

export interface RiskMatrixCellInput {
  likelihoodValue: number;
  severityValue: number;
  riskScore: number;
  riskLevel: string;
  colorCode: string;
  requiredActionDescription?: string;
  // Task 3.2 — opsional (default false), tenant custom matrix (Visual
  // Builder) menyetel eksplisit cell mana yang butuh eskalasi Top
  // Management, TERPISAH dari riskLevel yang murni label tampilan (lihat
  // banner comment risk_matrix_cells.requiresEscalation, schema.prisma).
  requiresEscalation?: boolean;
}

export interface CreateRiskMatrixConfigInput {
  name: string;
  applicableModuleScope?: RiskMatrixModuleScope;
  likelihoodLevels?: number;
  severityLevels?: number;
  levels: RiskMatrixLevelInput[];
  cells: RiskMatrixCellInput[];
}

export interface CreateRiskMatrixVersionInput {
  name: string;
  likelihoodLevels?: number;
  severityLevels?: number;
  levels: RiskMatrixLevelInput[];
  cells: RiskMatrixCellInput[];
}

export type RiskMatrixConfigWithGrid = RiskMatrixConfig & { levels: RiskMatrixLevel[]; cells: RiskMatrixCell[] };

// Task 3.1 (Modul 05 §5/§6 BR-09). BELUM ada controller HTTP (pola sama
// seluruh modul domain Phase 2+ sejauh ini tanpa deliverable apps/web) —
// risk.matrix_config.manage sudah di-seed RBAC baseline (task 104), siap
// digerbangi @RequirePermission begitu ada endpoint (mis. "Visual Builder
// Matriks Risiko" PRD §12).
@Injectable()
export class RiskMatrixConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Authoring matriks BARU (Visual Builder, PRD §12) — satu unit kerja
   * (config+levels+cells) ditulis SEKALIGUS dalam satu withRls(), TIDAK ADA
   * panggilan ke service lain yang membuka withRls()/$transaction sendiri
   * di dalamnya (aman dari pitfall nested-transaction 2.1). Partial unique
   * index (1 aktif per tenant+scope, task 103) menegakkan caller TIDAK
   * bisa create() kedua kali utk scope yang sudah py versi aktif — pesan
   * error diarahkan ke createNewVersion() sbg gantinya.
   */
  async create(input: CreateRiskMatrixConfigInput): Promise<RiskMatrixConfig> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    const scope = input.applicableModuleScope ?? "ALL";

    return withCleanUniqueViolation(
      () =>
        this.prisma.withRls(async (tx) => {
          const config = await tx.riskMatrixConfig.create({
            data: {
              tenantId,
              name: input.name,
              applicableModuleScope: scope,
              likelihoodLevels: input.likelihoodLevels ?? 5,
              severityLevels: input.severityLevels ?? 5,
              version: 1,
              isActive: true,
              createdBy,
              updatedBy: createdBy,
            },
          });

          await tx.riskMatrixLevel.createMany({
            data: input.levels.map((l) => ({ tenantId, riskMatrixConfigId: config.id, ...l })),
          });
          await tx.riskMatrixCell.createMany({
            data: input.cells.map((c) => ({ tenantId, riskMatrixConfigId: config.id, ...c })),
          });

          return config;
        }),
      `Sudah ada risk_matrix_configs AKTIF utk scope=${scope} pada tenant ini — pakai createNewVersion() utk merevisi, bukan create() lagi.`,
    );
  }

  /**
   * BR-09 (PRD §6) — "Perubahan risk_matrix_configs membuat versi BARU;
   * assessment yang sudah dibuat tetap mengacu versi lama, tidak berubah
   * skornya secara retroaktif." Baris LAMA disentuh HANYA utk isActive->false
   * (kolom lain SAMA SEKALI tidak diupdate) — deactivate dilakukan SEBELUM
   * insert baris baru dalam transaksi yang SAMA, supaya partial unique index
   * tidak pernah sempat melihat 2 baris aktif utk scope yang sama di titik
   * mana pun (bukan celah TOCTOU antara dua transaksi terpisah).
   */
  async createNewVersion(previousConfigId: string, input: CreateRiskMatrixVersionInput): Promise<RiskMatrixConfig> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const previous = await tx.riskMatrixConfig.findUniqueOrThrow({ where: { id: previousConfigId } });
      if (!previous.isActive) {
        throw new BadRequestException(`risk_matrix_configs ${previousConfigId} bukan versi aktif — hanya versi aktif yang bisa diversi-baru-kan.`);
      }

      await tx.riskMatrixConfig.update({ where: { id: previousConfigId }, data: { isActive: false, updatedBy: createdBy } });

      const config = await tx.riskMatrixConfig.create({
        data: {
          tenantId,
          name: input.name,
          applicableModuleScope: previous.applicableModuleScope,
          likelihoodLevels: input.likelihoodLevels ?? previous.likelihoodLevels,
          severityLevels: input.severityLevels ?? previous.severityLevels,
          version: previous.version + 1,
          isActive: true,
          createdBy,
          updatedBy: createdBy,
        },
      });

      await tx.riskMatrixLevel.createMany({
        data: input.levels.map((l) => ({ tenantId, riskMatrixConfigId: config.id, ...l })),
      });
      await tx.riskMatrixCell.createMany({
        data: input.cells.map((c) => ({ tenantId, riskMatrixConfigId: config.id, ...c })),
      });

      return config;
    });
  }

  /**
   * PRD §5 "NULL berarti berlaku lebih luas"-style fallback (pola sama
   * DocumentService.listPublishedForCurrentUser() 2.1 utk site/department
   * NULL) — konfigurasi scope-spesifik (mis. HIRA) MENANG kalau ada &
   * aktif, baru fallback ke scope ALL kalau tidak. Dipakai task 3.2 saat
   * hira_assessments/dst butuh tahu matriks mana yang berlaku.
   */
  async resolveActiveConfig(scope: RiskMatrixModuleScope): Promise<RiskMatrixConfig> {
    return this.prisma.withRls(async (tx) => {
      const scopeSpecific =
        scope !== "ALL" ? await tx.riskMatrixConfig.findFirst({ where: { applicableModuleScope: scope, isActive: true } }) : null;
      if (scopeSpecific) return scopeSpecific;

      const fallback = await tx.riskMatrixConfig.findFirst({ where: { applicableModuleScope: "ALL", isActive: true } });
      if (!fallback) {
        throw new NotFoundException(
          `Tidak ada risk_matrix_configs aktif utk scope=${scope} maupun ALL — jalankan RiskMatrixBootstrapService.ensureDefaultMatrix() dulu.`,
        );
      }
      return fallback;
    });
  }

  async getById(configId: string): Promise<RiskMatrixConfigWithGrid> {
    return this.prisma.withRls((tx) =>
      tx.riskMatrixConfig.findUniqueOrThrow({ where: { id: configId }, include: { levels: true, cells: true } }),
    );
  }

  async listVersions(scope: RiskMatrixModuleScope): Promise<RiskMatrixConfig[]> {
    return this.prisma.withRls((tx) =>
      tx.riskMatrixConfig.findMany({ where: { applicableModuleScope: scope }, orderBy: { version: "desc" } }),
    );
  }
}
