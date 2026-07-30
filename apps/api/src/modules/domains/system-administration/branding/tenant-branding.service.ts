import { BadRequestException, Injectable } from "@nestjs/common";
import { TenantBrandingConfig } from "@prisma/client";
import { PrismaService } from "../../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId, withCleanUniqueViolation } from "../provisioning/system-administration-context";
import { isValidCustomDomainFormat } from "./custom-domain";

export interface UpsertTenantBrandingInput {
  logoUrl?: string | null;
  primaryColor?: string | null;
  displayName?: string | null;
  customDomain?: string | null;
}

// PRD Modul 31 §4.2/§12 — branding tenant ringan, self-service Tenant Admin
// (permission sysadmin.branding.manage, belum ditegakkan di layer ini —
// belum ada controller HTTP, pola konsisten 1.1-1.6, PermissionGuard yang
// akan menggerbanginya begitu ada endpoint).
@Injectable()
export class TenantBrandingService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(input: UpsertTenantBrandingInput): Promise<TenantBrandingConfig> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    const customDomain = normalizeCustomDomain(input.customDomain);
    if (customDomain && !isValidCustomDomainFormat(customDomain)) {
      throw new BadRequestException(`Format custom_domain tidak valid: "${customDomain}".`);
    }

    return this.prisma.withRls((tx) =>
      withCleanUniqueViolation(
        () =>
          tx.tenantBrandingConfig.upsert({
            where: { tenantId },
            create: {
              tenantId,
              logoUrl: input.logoUrl ?? null,
              primaryColor: input.primaryColor ?? null,
              displayName: input.displayName ?? null,
              customDomain,
              createdBy: actorUserId,
              updatedBy: actorUserId,
            },
            update: {
              logoUrl: input.logoUrl ?? null,
              primaryColor: input.primaryColor ?? null,
              displayName: input.displayName ?? null,
              customDomain,
              updatedBy: actorUserId,
            },
          }),
        `custom_domain "${customDomain}" sudah dipakai tenant lain.`,
      ),
    );
  }

  async getByTenantId(): Promise<TenantBrandingConfig | null> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.tenantBrandingConfig.findUnique({ where: { tenantId } }));
  }
}

function normalizeCustomDomain(customDomain: string | null | undefined): string | null {
  if (!customDomain) return null;
  const trimmed = customDomain.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}
