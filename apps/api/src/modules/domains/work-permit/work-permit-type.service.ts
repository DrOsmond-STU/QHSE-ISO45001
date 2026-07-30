import { Injectable } from "@nestjs/common";
import { WorkPermitRiskLevel, WorkPermitType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./work-permit-context";

export interface CreateWorkPermitTypeInput {
  code: string;
  name: string;
  description?: string;
  requiresGasTest?: boolean;
  requiresLoto?: boolean;
  requiresHseApproval?: boolean;
  defaultRiskLevel?: WorkPermitRiskLevel;
  defaultValidityHours?: number;
  maxExtensionCount?: number;
  gasRetestIntervalHours?: number;
}

export interface UpdateWorkPermitTypeInput {
  name?: string;
  description?: string;
  requiresGasTest?: boolean;
  requiresLoto?: boolean;
  requiresHseApproval?: boolean;
  defaultRiskLevel?: WorkPermitRiskLevel;
  defaultValidityHours?: number;
  maxExtensionCount?: number;
  gasRetestIntervalHours?: number;
}

// Task 3.3 (Modul 06 §3 "Tenant Admin | work_permit.type.manage", §5).
// BELUM ada controller HTTP (pola sama seluruh modul domain Phase 2+).
// `code` SENGAJA VARCHAR bebas (bukan enum) — lihat banner comment
// schema.prisma WorkPermitType (PRD §2.1 "dan tipe custom lain").
@Injectable()
export class WorkPermitTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWorkPermitTypeInput): Promise<WorkPermitType> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.workPermitType.create({
        data: {
          tenantId,
          code: input.code,
          name: input.name,
          description: input.description,
          requiresGasTest: input.requiresGasTest ?? false,
          requiresLoto: input.requiresLoto ?? false,
          requiresHseApproval: input.requiresHseApproval ?? false,
          defaultRiskLevel: input.defaultRiskLevel ?? "LOW",
          defaultValidityHours: input.defaultValidityHours ?? 8,
          maxExtensionCount: input.maxExtensionCount ?? 1,
          gasRetestIntervalHours: input.gasRetestIntervalHours,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async update(workPermitTypeId: string, input: UpdateWorkPermitTypeInput): Promise<WorkPermitType> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) => tx.workPermitType.update({ where: { id: workPermitTypeId }, data: { ...input, updatedBy } }));
  }

  async getById(workPermitTypeId: string): Promise<WorkPermitType> {
    return this.prisma.withRls((tx) => tx.workPermitType.findUniqueOrThrow({ where: { id: workPermitTypeId } }));
  }

  async listActive(): Promise<WorkPermitType[]> {
    return this.prisma.withRls((tx) => tx.workPermitType.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }));
  }

  /** Soft delete (deletedAt + isActive false) — pola sama seluruh service
   * "type"/"category" config lain di codebase ini. TIDAK ADA BR referensial
   * literal PRD utk tipe yang masih dipakai work_permits AKTIF (beda dari
   * hazard_register BR-07, Modul 05) — retire() TIDAK memvalidasi referensi,
   * gap TDD §26. */
  async retire(workPermitTypeId: string): Promise<WorkPermitType> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.workPermitType.update({ where: { id: workPermitTypeId }, data: { isActive: false, deletedAt: new Date(), updatedBy } }),
    );
  }
}
