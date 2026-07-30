import { Injectable } from "@nestjs/common";
import { InspectionType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./inspection-context";

export interface CreateInspectionTypeInput {
  code: string;
  name: string;
  description?: string;
}

// Task 3.6 (Modul 08 §3 "Tenant Admin | inspection.type.manage"). BELUM ada
// controller HTTP (pola sama seluruh modul domain Phase 2+). `code`
// SENGAJA VARCHAR bebas (bukan enum) — PRD §2.1 "dan tipe custom lain".
@Injectable()
export class InspectionTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInspectionTypeInput): Promise<InspectionType> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.inspectionType.create({
        data: { tenantId, code: input.code, name: input.name, description: input.description, createdBy, updatedBy: createdBy },
      }),
    );
  }

  async getById(inspectionTypeId: string): Promise<InspectionType> {
    return this.prisma.withRls((tx) => tx.inspectionType.findUniqueOrThrow({ where: { id: inspectionTypeId } }));
  }

  async listActive(): Promise<InspectionType[]> {
    return this.prisma.withRls((tx) => tx.inspectionType.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }));
  }

  async retire(inspectionTypeId: string): Promise<InspectionType> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.inspectionType.update({ where: { id: inspectionTypeId }, data: { isActive: false, deletedAt: new Date(), updatedBy } }),
    );
  }
}
