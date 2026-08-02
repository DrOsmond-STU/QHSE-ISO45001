import { ContractorWorker, ContractorWorkerCategory } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface RegisterWorkerInput {
    contractorId: string;
    projectAssignmentId?: string;
    fullName: string;
    idNumberKtp?: string;
    dateOfBirth?: Date;
    jobPosition?: string;
    workerCategory: ContractorWorkerCategory;
    isAuthorizedPermitRequester?: boolean;
}
export declare class ContractorWorkerService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    register(input: RegisterWorkerInput): Promise<ContractorWorker>;
    completeSiteInduction(id: string, inductionDate?: Date): Promise<ContractorWorker>;
    demobilize(id: string): Promise<ContractorWorker>;
    updateAuthorizedPermitRequester(id: string, isAuthorizedPermitRequester: boolean): Promise<ContractorWorker>;
    getById(id: string): Promise<ContractorWorker>;
    listByAssignment(projectAssignmentId: string): Promise<ContractorWorker[]>;
}
