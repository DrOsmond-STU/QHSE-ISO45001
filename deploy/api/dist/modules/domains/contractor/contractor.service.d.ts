import { Contractor, ContractorCategory, ContractorRiskRating, ContractorStatus, ContractorType } from "@prisma/client";
import { AuditLogService } from "../../../platform/audit-log/audit-log.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateContractorInput {
    contractorName: string;
    contractorType: ContractorType;
    businessRegistrationNo?: string;
    businessLicenseType?: string;
    taxIdNpwp?: string;
    address?: string;
    city?: string;
    province?: string;
    contactPersonName?: string;
    contactPersonPhone?: string;
    contactPersonEmail?: string;
    contractorCategory: ContractorCategory;
    parentContractorId?: string;
    overallRiskRating: ContractorRiskRating;
}
export type UpdateContractorInput = Partial<Omit<CreateContractorInput, "contractorCategory">>;
export declare class ContractorService {
    private readonly prisma;
    private readonly auditLogService;
    constructor(prisma: PrismaService, auditLogService: AuditLogService);
    create(input: CreateContractorInput): Promise<Contractor>;
    update(id: string, input: UpdateContractorInput): Promise<Contractor>;
    updateStatus(id: string, newStatus: ContractorStatus, justification?: string): Promise<Contractor>;
    getById(id: string): Promise<Contractor>;
    list(): Promise<Contractor[]>;
}
