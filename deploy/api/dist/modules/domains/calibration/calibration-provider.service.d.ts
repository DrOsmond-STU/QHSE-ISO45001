import { CalibrationProvider, CalibrationProviderType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateCalibrationProviderInput {
    providerName: string;
    providerType: CalibrationProviderType;
    accreditationBody?: string;
    accreditationNumber?: string;
    accreditationScope?: unknown;
    accreditationValidUntil?: Date;
    address?: string;
    contactPersonName?: string;
    contactPersonPhone?: string;
    contactPersonEmail?: string;
}
export type UpdateCalibrationProviderInput = Partial<CreateCalibrationProviderInput> & {
    isActive?: boolean;
};
export declare class CalibrationProviderService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateCalibrationProviderInput): Promise<CalibrationProvider>;
    update(id: string, input: UpdateCalibrationProviderInput): Promise<CalibrationProvider>;
    getById(id: string): Promise<CalibrationProvider>;
    list(): Promise<CalibrationProvider[]>;
}
