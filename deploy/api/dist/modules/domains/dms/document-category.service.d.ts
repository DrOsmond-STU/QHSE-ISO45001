import { DocumentCategory } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateDocumentCategoryInput {
    name: string;
    code: string;
    parentCategoryId?: string;
    defaultNumberingConfigId?: string;
    defaultReviewCycleMonths?: number;
}
export declare class DocumentCategoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateDocumentCategoryInput): Promise<DocumentCategory>;
    listActive(): Promise<DocumentCategory[]>;
    getById(documentCategoryId: string): Promise<DocumentCategory>;
    getByCode(code: string): Promise<DocumentCategory | null>;
}
