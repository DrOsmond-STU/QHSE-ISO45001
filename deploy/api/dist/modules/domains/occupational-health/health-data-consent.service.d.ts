import { HealthDataConsent, OhConsentChannel, OhConsentPurpose } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface GrantConsentInput {
    employeeUserId: string;
    consentPurpose: OhConsentPurpose;
    consentGivenAt: Date;
    consentChannel: OhConsentChannel;
}
export declare class HealthDataConsentService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    grant(input: GrantConsentInput): Promise<HealthDataConsent>;
    withdraw(id: string, withdrawalReason: string): Promise<HealthDataConsent>;
    getById(id: string): Promise<HealthDataConsent>;
    listByEmployee(employeeUserId: string): Promise<HealthDataConsent[]>;
}
