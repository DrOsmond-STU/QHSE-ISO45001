import { Injectable } from "@nestjs/common";
import { AuditChecklist, AuditChecklistItem, Prisma } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./audit-context";

export interface CreateAuditChecklistItemInput {
  clauseReference: string;
  sequenceNo: number;
  criteriaText: string;
  guidanceNote?: string;
}

export interface CreateAuditChecklistInput {
  name: string;
  standardCode: string;
  items: CreateAuditChecklistItemInput[];
}

// Task 4.1 (Modul 09 §3 "Audit Program Owner/MR | audit.checklist.manage").
// BELUM ada controller HTTP. `version` TIDAK punya method createNewVersion()
// (BEDA dari InspectionChecklistTemplateService 3.6/BR-07-nya) — PRD §5
// modul ini tidak memberi BR wajib versi baru tiap perubahan, lihat banner
// comment AuditChecklist.version di schema.prisma.
@Injectable()
export class AuditChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditChecklistInput): Promise<AuditChecklist> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const checklist = await tx.auditChecklist.create({
        data: {
          tenantId,
          name: input.name,
          standardCode: input.standardCode,
          version: 1,
          isActive: true,
          createdBy,
          updatedBy: createdBy,
        },
      });
      await this.createItems(tx, tenantId, checklist.id, input.items, createdBy);
      return checklist;
    });
  }

  async addItem(auditChecklistId: string, input: CreateAuditChecklistItemInput): Promise<AuditChecklistItem> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.auditChecklistItem.create({
        data: {
          tenantId,
          auditChecklistId,
          clauseReference: input.clauseReference,
          sequenceNo: input.sequenceNo,
          criteriaText: input.criteriaText,
          guidanceNote: input.guidanceNote,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  private async createItems(
    tx: Prisma.TransactionClient,
    tenantId: string,
    auditChecklistId: string,
    items: CreateAuditChecklistItemInput[],
    createdBy: string,
  ): Promise<void> {
    if (items.length === 0) return;
    await tx.auditChecklistItem.createMany({
      data: items.map((item) => ({
        tenantId,
        auditChecklistId,
        clauseReference: item.clauseReference,
        sequenceNo: item.sequenceNo,
        criteriaText: item.criteriaText,
        guidanceNote: item.guidanceNote,
        createdBy,
        updatedBy: createdBy,
      })),
    });
  }

  async getById(auditChecklistId: string) {
    return this.prisma.withRls((tx) =>
      tx.auditChecklist.findUniqueOrThrow({ where: { id: auditChecklistId }, include: { items: { orderBy: { sequenceNo: "asc" } } } }),
    );
  }

  async listActive(): Promise<AuditChecklist[]> {
    return this.prisma.withRls((tx) => tx.auditChecklist.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }));
  }

  async retire(auditChecklistId: string): Promise<AuditChecklist> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.auditChecklist.update({ where: { id: auditChecklistId }, data: { isActive: false, deletedAt: new Date(), updatedBy } }),
    );
  }
}
