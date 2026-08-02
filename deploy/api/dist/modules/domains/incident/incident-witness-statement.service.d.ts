import { IncidentWitnessStatement } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface RecordIncidentWitnessStatementInput {
    incidentReportId: string;
    witnessUserId?: string;
    witnessNameExternal?: string;
    statementText: string;
    statementDatetime: Date;
}
export declare class IncidentWitnessStatementService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    record(input: RecordIncidentWitnessStatementInput): Promise<IncidentWitnessStatement>;
    listByReport(incidentReportId: string): Promise<IncidentWitnessStatement[]>;
}
