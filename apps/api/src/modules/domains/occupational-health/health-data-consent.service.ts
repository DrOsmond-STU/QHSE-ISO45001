import { Injectable } from "@nestjs/common";
import { HealthDataConsent, OhConsentChannel, OhConsentPurpose } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";

export interface GrantConsentInput {
  employeeUserId: string;
  consentPurpose: OhConsentPurpose;
  consentGivenAt: Date;
  consentChannel: OhConsentChannel;
}

// PRD §4.6 — consent per tujuan pemrosesan (§11 UU PDP), TANPA field
// [ENCRYPTED] (bukan data klinis, hanya metadata persetujuan) — CRUD
// sederhana, tidak melalui dual-gate BR-02 (bukan data klinis mentah).
@Injectable()
export class HealthDataConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async grant(input: GrantConsentInput): Promise<HealthDataConsent> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.healthDataConsent.create({
        data: {
          tenantId,
          employeeUserId: input.employeeUserId,
          consentPurpose: input.consentPurpose,
          consentStatus: "GRANTED",
          consentGivenAt: input.consentGivenAt,
          consentChannel: input.consentChannel,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async withdraw(id: string, withdrawalReason: string): Promise<HealthDataConsent> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.healthDataConsent.update({
        where: { id },
        data: {
          consentStatus: "WITHDRAWN",
          withdrawalDate: new Date(),
          withdrawalReason,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async getById(id: string): Promise<HealthDataConsent> {
    return this.prisma.withRls((tx) => tx.healthDataConsent.findUniqueOrThrow({ where: { id } }));
  }

  async listByEmployee(employeeUserId: string): Promise<HealthDataConsent[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.healthDataConsent.findMany({ where: { tenantId, employeeUserId }, orderBy: { consentGivenAt: "desc" } }),
    );
  }
}
