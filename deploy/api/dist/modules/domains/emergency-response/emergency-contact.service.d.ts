import { EmergencyContact, EmergencyContactCategory } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateEmergencyContactInput {
    siteId?: string;
    contactCategory: EmergencyContactCategory;
    contactName: string;
    organizationName?: string;
    phonePrimary: string;
    phoneSecondary?: string;
    email?: string;
    address?: string;
    distanceFromSiteKm?: number;
    estimatedResponseTimeMinutes?: number;
    is24x7?: boolean;
    notes?: string;
}
export declare class EmergencyContactService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateEmergencyContactInput): Promise<EmergencyContact>;
    getById(emergencyContactId: string): Promise<EmergencyContact>;
    /** siteId opsional (PRD §5 "nullable utk kontak lingkup company-wide") —
     * ADA kalau caller mau kontak khusus site TERTENTU + yang company-wide
     * SEKALIGUS, TIDAK ADA kalau caller mau seluruh katalog tenant. */
    listActive(siteId?: string): Promise<EmergencyContact[]>;
    deactivate(emergencyContactId: string): Promise<EmergencyContact>;
}
