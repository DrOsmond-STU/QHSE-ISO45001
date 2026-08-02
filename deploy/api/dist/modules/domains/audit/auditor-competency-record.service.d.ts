import { AuditorCompetencyRecord, AuditorCompetencyType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateAuditorCompetencyRecordInput {
    userId: string;
    competencyType: AuditorCompetencyType;
    standardScope: string;
    certificationBody?: string;
    certificateNumber?: string;
    issuedDate: Date;
    expiryDate?: Date;
    relatedTrainingRecordId?: string;
}
export declare class AuditorCompetencyRecordService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateAuditorCompetencyRecordInput): Promise<AuditorCompetencyRecord>;
    revoke(competencyRecordId: string): Promise<AuditorCompetencyRecord>;
    markExpired(competencyRecordId: string): Promise<AuditorCompetencyRecord>;
    getById(competencyRecordId: string): Promise<AuditorCompetencyRecord>;
    listByUser(userId: string): Promise<AuditorCompetencyRecord[]>;
}
