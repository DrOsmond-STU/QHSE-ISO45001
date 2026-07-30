import { Injectable } from "@nestjs/common";
import { AssetCategory } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./asset-equipment-context";

export interface CreateAssetCategoryInput {
  categoryName: string;
  parentCategoryId?: string;
  defaultIsSafetyCritical?: boolean;
  requiresDisposalApproval?: boolean;
}

export type UpdateAssetCategoryInput = Partial<CreateAssetCategoryInput>;

@Injectable()
export class AssetCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAssetCategoryInput): Promise<AssetCategory> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    return this.prisma.withRls((tx) =>
      tx.assetCategory.create({
        data: {
          tenantId,
          categoryName: input.categoryName,
          parentCategoryId: input.parentCategoryId,
          defaultIsSafetyCritical: input.defaultIsSafetyCritical ?? false,
          requiresDisposalApproval: input.requiresDisposalApproval ?? false,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async update(id: string, input: UpdateAssetCategoryInput): Promise<AssetCategory> {
    const actorUserId = requireActorUserId();

    return this.prisma.withRls((tx) =>
      tx.assetCategory.update({
        where: { id },
        data: {
          categoryName: input.categoryName,
          parentCategoryId: input.parentCategoryId,
          defaultIsSafetyCritical: input.defaultIsSafetyCritical,
          requiresDisposalApproval: input.requiresDisposalApproval,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async getById(id: string): Promise<AssetCategory> {
    return this.prisma.withRls((tx) => tx.assetCategory.findUniqueOrThrow({ where: { id } }));
  }

  async list(): Promise<AssetCategory[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.assetCategory.findMany({ where: { tenantId, deletedAt: null }, orderBy: { categoryName: "asc" } }));
  }

  async softDelete(id: string): Promise<AssetCategory> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) => tx.assetCategory.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorUserId } }));
  }
}
