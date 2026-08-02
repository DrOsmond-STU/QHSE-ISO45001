import { ContractorComplianceDocumentCategory, ContractorDocumentCompliance } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface RegisterComplianceDocumentInput {
    contractorId: string;
    documentCategory: ContractorComplianceDocumentCategory;
    documentId?: string;
    documentNumber?: string;
    issuedBy?: string;
    issueDate?: Date;
    expiryDate: Date;
    reminderDaysBefore?: number;
    isMandatoryForPtk007?: boolean;
}
export declare class ContractorDocumentComplianceService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    register(input: RegisterComplianceDocumentInput): Promise<ContractorDocumentCompliance>;
    markRenewalInProgress(id: string): Promise<ContractorDocumentCompliance>;
    renew(id: string, newExpiryDate: Date): Promise<ContractorDocumentCompliance>;
    hasBlockingExpiredCompliance(contractorId: string): Promise<boolean>;
    listByContractor(contractorId: string): Promise<ContractorDocumentCompliance[]>;
    getById(id: string): Promise<ContractorDocumentCompliance>;
}
