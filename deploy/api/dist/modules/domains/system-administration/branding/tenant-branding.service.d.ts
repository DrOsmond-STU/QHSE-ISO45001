import { TenantBrandingConfig } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
export interface UpsertTenantBrandingInput {
    logoUrl?: string | null;
    primaryColor?: string | null;
    displayName?: string | null;
    customDomain?: string | null;
}
export declare class TenantBrandingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    upsert(input: UpsertTenantBrandingInput): Promise<TenantBrandingConfig>;
    getByTenantId(): Promise<TenantBrandingConfig | null>;
}
