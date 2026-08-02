import { EmergencyMusterPoint } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateEmergencyMusterPointInput {
    siteId: string;
    musterPointCode: string;
    musterPointName: string;
    locationDescription?: string;
    gpsLat?: number;
    gpsLong?: number;
    capacityEstimate?: number;
}
export declare class EmergencyMusterPointService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateEmergencyMusterPointInput): Promise<EmergencyMusterPoint>;
    getById(musterPointId: string): Promise<EmergencyMusterPoint>;
    listActiveBySite(siteId: string): Promise<EmergencyMusterPoint[]>;
    deactivate(musterPointId: string): Promise<EmergencyMusterPoint>;
}
