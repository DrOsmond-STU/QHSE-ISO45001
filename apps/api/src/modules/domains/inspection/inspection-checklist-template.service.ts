import { Injectable } from "@nestjs/common";
import {
  InspectionChecklistTemplate,
  InspectionChecklistTemplateItem,
  InspectionResponseType,
  InspectionScoringMethod,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./inspection-context";

export interface CreateInspectionChecklistTemplateItemInput {
  sequenceNo: number;
  itemText: string;
  category?: string;
  responseType: InspectionResponseType;
  weight?: number;
  isMandatory?: boolean;
  requiresPhotoIfFail?: boolean;
}

export interface CreateInspectionChecklistTemplateInput {
  inspectionTypeId: string;
  name: string;
  scoringMethod: InspectionScoringMethod;
  passingScoreThreshold?: number;
  effectiveDate: Date;
  items: CreateInspectionChecklistTemplateItemInput[];
}

// Task 3.6 (Modul 08 §3 "Tenant Admin | inspection.template.manage", §5,
// BR-07). BELUM ada controller HTTP. Item template DIKELOLA DI SINI
// (bukan service terpisah) — inspection_checklist_template_items TIDAK
// PUNYA siklus hidup independen dari template induknya.
@Injectable()
export class InspectionChecklistTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInspectionChecklistTemplateInput): Promise<InspectionChecklistTemplate> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const template = await tx.inspectionChecklistTemplate.create({
        data: {
          tenantId,
          inspectionTypeId: input.inspectionTypeId,
          name: input.name,
          version: 1,
          scoringMethod: input.scoringMethod,
          passingScoreThreshold: input.passingScoreThreshold,
          effectiveDate: input.effectiveDate,
          isActive: true,
          createdBy,
          updatedBy: createdBy,
        },
      });
      await this.createItems(tx, tenantId, template.id, input.items, createdBy);
      return template;
    });
  }

  /**
   * BR-07 — "perubahan versi TIDAK mengubah record historis... record
   * menyimpan referensi versi snapshot." Versi BARU = BARIS BARU
   * (version = versi aktif TERAKHIR + 1), baris LAMA TIDAK PERNAH diupdate
   * SELAIN isActive->false — pola PERSIS RiskMatrixConfigService (3.1,
   * versioned CRUD). inspection_records yang SUDAH memakai versi lama
   * TETAP menunjuk baris LAMA via FK snapshot (inspectionChecklistTemplateId),
   * genuinely tidak tersentuh operasi ini.
   */
  async createNewVersion(
    inspectionTypeId: string,
    input: Omit<CreateInspectionChecklistTemplateInput, "inspectionTypeId">,
  ): Promise<InspectionChecklistTemplate> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls(async (tx) => {
      const previous = await tx.inspectionChecklistTemplate.findFirst({
        where: { inspectionTypeId, isActive: true },
        orderBy: { version: "desc" },
      });
      if (previous) {
        await tx.inspectionChecklistTemplate.update({ where: { id: previous.id }, data: { isActive: false, updatedBy: createdBy } });
      }
      const template = await tx.inspectionChecklistTemplate.create({
        data: {
          tenantId,
          inspectionTypeId,
          name: input.name,
          version: (previous?.version ?? 0) + 1,
          scoringMethod: input.scoringMethod,
          passingScoreThreshold: input.passingScoreThreshold,
          effectiveDate: input.effectiveDate,
          isActive: true,
          createdBy,
          updatedBy: createdBy,
        },
      });
      await this.createItems(tx, tenantId, template.id, input.items, createdBy);
      return template;
    });
  }

  private async createItems(
    tx: Prisma.TransactionClient,
    tenantId: string,
    templateId: string,
    items: CreateInspectionChecklistTemplateItemInput[],
    createdBy: string,
  ): Promise<void> {
    await tx.inspectionChecklistTemplateItem.createMany({
      data: items.map((item) => ({
        tenantId,
        inspectionChecklistTemplateId: templateId,
        sequenceNo: item.sequenceNo,
        itemText: item.itemText,
        category: item.category,
        responseType: item.responseType,
        weight: item.weight ?? 1,
        isMandatory: item.isMandatory ?? true,
        requiresPhotoIfFail: item.requiresPhotoIfFail ?? false,
        createdBy,
        updatedBy: createdBy,
      })),
    });
  }

  async resolveActiveTemplate(inspectionTypeId: string): Promise<InspectionChecklistTemplate> {
    return this.prisma.withRls((tx) =>
      tx.inspectionChecklistTemplate.findFirstOrThrow({ where: { inspectionTypeId, isActive: true }, orderBy: { version: "desc" } }),
    );
  }

  async getById(templateId: string) {
    return this.prisma.withRls((tx) =>
      tx.inspectionChecklistTemplate.findUniqueOrThrow({ where: { id: templateId }, include: { items: { orderBy: { sequenceNo: "asc" } } } }),
    );
  }

  async listItemsByTemplate(templateId: string): Promise<InspectionChecklistTemplateItem[]> {
    return this.prisma.withRls((tx) =>
      tx.inspectionChecklistTemplateItem.findMany({ where: { inspectionChecklistTemplateId: templateId }, orderBy: { sequenceNo: "asc" } }),
    );
  }
}
