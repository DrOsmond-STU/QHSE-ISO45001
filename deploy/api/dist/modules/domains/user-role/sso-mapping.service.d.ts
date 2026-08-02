import { SsoIdpProvider, SsoMapping } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateSsoMappingInput {
    userId?: string;
    idpProvider: SsoIdpProvider;
    idpTenantIdentifier?: string;
    externalSubjectId: string;
    externalEmail?: string;
    autoProvision?: boolean;
    defaultRoleIdOnProvision?: string;
}
export declare class SsoMappingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createMapping(input: CreateSsoMappingInput): Promise<SsoMapping>;
    resolveByExternalSubject(idpProvider: SsoIdpProvider, externalSubjectId: string): Promise<SsoMapping | null>;
    linkUser(ssoMappingId: string, userId: string): Promise<SsoMapping>;
    deactivateMapping(ssoMappingId: string): Promise<SsoMapping>;
}
