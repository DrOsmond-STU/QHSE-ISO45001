import { AuditChecklist, AuditChecklistItem } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
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
export declare class AuditChecklistService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateAuditChecklistInput): Promise<AuditChecklist>;
    addItem(auditChecklistId: string, input: CreateAuditChecklistItemInput): Promise<AuditChecklistItem>;
    private createItems;
    getById(auditChecklistId: string): Promise<{
        items: {
            id: string;
            tenantId: string;
            createdBy: string;
            createdAt: Date;
            updatedBy: string;
            updatedAt: Date;
            deletedAt: Date | null;
            sequenceNo: number;
            auditChecklistId: string;
            clauseReference: string;
            criteriaText: string;
            guidanceNote: string | null;
        }[];
    } & {
        version: number;
        isActive: boolean;
        name: string;
        id: string;
        tenantId: string;
        createdBy: string;
        createdAt: Date;
        updatedBy: string;
        updatedAt: Date;
        deletedAt: Date | null;
        standardCode: string;
    }>;
    listActive(): Promise<AuditChecklist[]>;
    retire(auditChecklistId: string): Promise<AuditChecklist>;
}
