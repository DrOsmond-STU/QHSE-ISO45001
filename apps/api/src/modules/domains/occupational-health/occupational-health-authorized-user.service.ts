import { Injectable } from "@nestjs/common";
import { OccupationalHealthAuthorizedUser, OhAuthorizedScopeType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";

export interface GrantAuthorizationInput {
  userId: string;
  authorizedScopeType: OhAuthorizedScopeType;
  authorizedScopeId: string;
  medicalPractitionerLicenseNo?: string;
  authorizationReason: string;
  expiryDate?: Date;
}

// BR-02 dual-gate bagian (b) — admin CRUD whitelist. PRD §13 Open Question
// #1 SENDIRI belum menjawab apakah wajib dual-approval (HSE Manager +
// Tenant Admin) atau cukup Tenant Admin tunggal — diimplementasikan SEBAGAI
// single-approval (authorizedBy = actor tunggal) demi kesederhanaan Phase
// 1, gap TDD §26 (dual-approval BUTUH state machine "pending confirmation"
// baru yang PRD sendiri belum putuskan strukturnya).
@Injectable()
export class OccupationalHealthAuthorizedUserService {
  constructor(private readonly prisma: PrismaService) {}

  async grant(input: GrantAuthorizationInput): Promise<OccupationalHealthAuthorizedUser> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.occupationalHealthAuthorizedUser.create({
        data: {
          tenantId,
          userId: input.userId,
          authorizedScopeType: input.authorizedScopeType,
          authorizedScopeId: input.authorizedScopeId,
          medicalPractitionerLicenseNo: input.medicalPractitionerLicenseNo,
          authorizationReason: input.authorizationReason,
          authorizedBy: actorUserId,
          authorizedAt: new Date(),
          expiryDate: input.expiryDate,
          status: "ACTIVE",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async revoke(id: string, revokeReason: string): Promise<OccupationalHealthAuthorizedUser> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.occupationalHealthAuthorizedUser.update({
        where: { id },
        data: { status: "REVOKED", revokedAt: new Date(), revokedBy: actorUserId, revokeReason, updatedBy: actorUserId },
      }),
    );
  }

  async markExpired(id: string): Promise<OccupationalHealthAuthorizedUser> {
    return this.prisma.withRls((tx) => tx.occupationalHealthAuthorizedUser.update({ where: { id }, data: { status: "EXPIRED" } }));
  }

  async getById(id: string): Promise<OccupationalHealthAuthorizedUser> {
    return this.prisma.withRls((tx) => tx.occupationalHealthAuthorizedUser.findUniqueOrThrow({ where: { id } }));
  }

  async listByUser(userId: string): Promise<OccupationalHealthAuthorizedUser[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.occupationalHealthAuthorizedUser.findMany({ where: { tenantId, userId }, orderBy: { authorizedAt: "desc" } }));
  }

  /** Dipakai occupational-health-authorization-expiry-scan.service.ts (task
   * 265) — kandidat ACTIVE yang expiryDate-nya sudah lewat, TAPI status
   * kolomnya belum ditransisikan (fail-closed di isAuthorizationActive()
   * TIDAK bergantung ke scan ini, scan HANYA menjaga kolom status tetap
   * akurat utk pelaporan/UI). */
  async listActiveExpired(asOfDate: Date): Promise<OccupationalHealthAuthorizedUser[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.occupationalHealthAuthorizedUser.findMany({ where: { tenantId, status: "ACTIVE", expiryDate: { lt: asOfDate } } }),
    );
  }
}
