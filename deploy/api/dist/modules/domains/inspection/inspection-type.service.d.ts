import { InspectionType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateInspectionTypeInput {
    code: string;
    name: string;
    description?: string;
}
export declare class InspectionTypeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateInspectionTypeInput): Promise<InspectionType>;
    getById(inspectionTypeId: string): Promise<InspectionType>;
    listActive(): Promise<InspectionType[]>;
    retire(inspectionTypeId: string): Promise<InspectionType>;
}
