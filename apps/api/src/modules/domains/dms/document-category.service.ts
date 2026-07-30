import { Injectable } from "@nestjs/common";
import { DocumentCategory } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId, withCleanUniqueViolation } from "./dms-context";

export interface CreateDocumentCategoryInput {
  name: string;
  code: string;
  parentCategoryId?: string;
  defaultNumberingConfigId?: string;
  defaultReviewCycleMonths?: number;
}

// Task 2.1 (Modul 03 §5) — document_categories CRUD. BELUM ada controller
// HTTP (pola sama 1.1-1.6 utk modul tanpa deliverable apps/web) —
// dms.category.manage sudah di-seed ke RBAC baseline (task ini), siap
// digerbangi @RequirePermission begitu ada endpoint.
@Injectable()
export class DocumentCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateDocumentCategoryInput): Promise<DocumentCategory> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return withCleanUniqueViolation(
      () =>
        this.prisma.withRls((tx) =>
          tx.documentCategory.create({
            data: { ...input, tenantId, createdBy, updatedBy: createdBy },
          }),
        ),
      `Kode kategori "${input.code}" sudah dipakai di tenant ini.`,
    );
  }

  async listActive(): Promise<DocumentCategory[]> {
    return this.prisma.withRls((tx) =>
      tx.documentCategory.findMany({
        where: { status: "ACTIVE", deletedAt: null },
        orderBy: { name: "asc" },
      }),
    );
  }

  async getById(documentCategoryId: string): Promise<DocumentCategory> {
    return this.prisma.withRls((tx) => tx.documentCategory.findUniqueOrThrow({ where: { id: documentCategoryId } }));
  }

  async getByCode(code: string): Promise<DocumentCategory | null> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.documentCategory.findUnique({ where: { tenantId_code: { tenantId, code } } }));
  }
}
