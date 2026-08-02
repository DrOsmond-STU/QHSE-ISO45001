import { InspectionScore } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface RecordInspectionScoreInput {
    inspectionRecordId: string;
    category: string;
    scoreObtained: number;
    maxPossibleScore: number;
}
export declare class InspectionScoreService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    record(input: RecordInspectionScoreInput): Promise<InspectionScore>;
    listByRecord(inspectionRecordId: string): Promise<InspectionScore[]>;
}
