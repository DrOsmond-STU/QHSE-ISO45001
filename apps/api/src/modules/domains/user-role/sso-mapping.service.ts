import { Injectable } from "@nestjs/common";
import { SsoIdpProvider, SsoMapping } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId, withCleanUniqueViolation } from "./user-role-context";

export interface CreateSsoMappingInput {
  userId?: string;
  idpProvider: SsoIdpProvider;
  idpTenantIdentifier?: string;
  externalSubjectId: string;
  externalEmail?: string;
  autoProvision?: boolean;
  defaultRoleIdOnProvision?: string;
}

// Task 1.3 (Modul 02 §5/§2.2) — HANYA pemetaan identitas, bukan handshake
// SAML/OIDC sungguhan (Modul 30, belum ada). resolveByExternalSubject()
// adalah primitif yang akan dipanggil alur login SSO nanti begitu Modul 30
// (konfigurasi teknis IdP) ada — BELUM di-wire ke platform/auth/* sekarang
// (gap TDD §26, pola sama primitif business-day 1.2).
@Injectable()
export class SsoMappingService {
  constructor(private readonly prisma: PrismaService) {}

  async createMapping(input: CreateSsoMappingInput): Promise<SsoMapping> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      withCleanUniqueViolation(
        () =>
          tx.ssoMapping.create({
            data: {
              ...input,
              tenantId,
              createdBy,
              updatedBy: createdBy,
              autoProvision: input.autoProvision ?? false, // PRD §13 Open Question #4 — default FALSE eksplisit
            },
          }),
        `Mapping SSO (idp_provider, external_subject_id) ini sudah ada di tenant.`,
      ),
    );
  }

  async resolveByExternalSubject(idpProvider: SsoIdpProvider, externalSubjectId: string): Promise<SsoMapping | null> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.ssoMapping.findUnique({
        where: { tenantId_idpProvider_externalSubjectId: { tenantId, idpProvider, externalSubjectId } },
      }),
    );
  }

  async linkUser(ssoMappingId: string, userId: string): Promise<SsoMapping> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.ssoMapping.update({
        where: { id: ssoMappingId },
        data: { userId, lastSsoLoginAt: new Date(), updatedBy },
      }),
    );
  }

  async deactivateMapping(ssoMappingId: string): Promise<SsoMapping> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.ssoMapping.update({ where: { id: ssoMappingId }, data: { status: "INACTIVE", updatedBy } }),
    );
  }
}
