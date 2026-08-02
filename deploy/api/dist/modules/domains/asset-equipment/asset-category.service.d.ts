import { AssetCategory } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateAssetCategoryInput {
    categoryName: string;
    parentCategoryId?: string;
    defaultIsSafetyCritical?: boolean;
    requiresDisposalApproval?: boolean;
}
export type UpdateAssetCategoryInput = Partial<CreateAssetCategoryInput>;
export declare class AssetCategoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateAssetCategoryInput): Promise<AssetCategory>;
    update(id: string, input: UpdateAssetCategoryInput): Promise<AssetCategory>;
    getById(id: string): Promise<AssetCategory>;
    list(): Promise<AssetCategory[]>;
    softDelete(id: string): Promise<AssetCategory>;
}
