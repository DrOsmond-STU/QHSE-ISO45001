import { Injectable } from "@nestjs/common";
import { AuditType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./audit-context";

export interface CreateAuditTypeInput {
  code: string;
  name: string;
  description?: string;
  requiresExternalBody?: boolean;
}

// Task 4.1 (Modul 09 §3 "Audit Program Owner/MR | audit.type.manage"). BELUM
// ada controller HTTP (pola sama seluruh modul domain Phase 2+). `code`
// SENGAJA VARCHAR bebas (bukan enum) — PRD §5 daftar contoh
// (INTERNAL/EXTERNAL/SURVEILLANCE/CERTIFICATION/SUPPLIER/OTHER) sekadar
// contoh, bukan enum tertutup.
@Injectable()
export class AuditTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditTypeInput): Promise<AuditType> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.auditType.create({
        data: {
          tenantId,
          code: input.code,
          name: input.name,
          description: input.description,
          requiresExternalBody: input.requiresExternalBody ?? false,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async getById(auditTypeId: string): Promise<AuditType> {
    return this.prisma.withRls((tx) => tx.auditType.findUniqueOrThrow({ where: { id: auditTypeId } }));
  }

  async listActive(): Promise<AuditType[]> {
    return this.prisma.withRls((tx) => tx.auditType.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }));
  }

  async retire(auditTypeId: string): Promise<AuditType> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.auditType.update({ where: { id: auditTypeId }, data: { isActive: false, deletedAt: new Date(), updatedBy } }),
    );
  }
}
