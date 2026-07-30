import { Injectable } from "@nestjs/common";
import { ComplianceObligation, ObligationFrequency, ObligationType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { assertRegisterAcceptsNewObligation } from "./regulatory-register-rules";
import { requireActorUserId, requireTenantId } from "./regulatory-compliance-context";

export interface CreateComplianceObligationInput {
  regulatoryRegisterId: string;
  obligationDescription: string;
  obligationType: ObligationType;
  frequency: ObligationFrequency;
  obligationCode?: string;
  clauseReference?: string;
  responsibleUserId?: string;
  responsibleDepartmentId?: string;
  applicableSiteId?: string;
  nextDueDate?: Date;
}

export interface UpdateComplianceObligationInput {
  obligationDescription?: string;
  clauseReference?: string;
  responsibleUserId?: string;
  responsibleDepartmentId?: string;
  applicableSiteId?: string;
  frequency?: ObligationFrequency;
  nextDueDate?: Date;
}

// Task 2.2 (Modul 04 §4.1 poin 3/§6 BR-04). BELUM ada controller HTTP (pola
// sama seluruh modul domain Phase 2 sejauh ini tanpa deliverable apps/web)
// — compliance.obligation.manage/read sudah di-seed RBAC baseline (task 92).
@Injectable()
export class ComplianceObligationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * BR-04 (PRD §6) — register SUPERSEDED/REVOKED tidak boleh jadi acuan
   * obligation BARU. Status register dibaca DI DALAM transaksi yang sama
   * dgn create (bukan query terpisah sebelumnya) supaya tidak ada celah
   * TOCTOU antara pengecekan dan penulisan.
   */
  async create(input: CreateComplianceObligationInput): Promise<ComplianceObligation> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const register = await tx.regulatoryRegister.findUniqueOrThrow({ where: { id: input.regulatoryRegisterId } });
      assertRegisterAcceptsNewObligation(register.status);

      return tx.complianceObligation.create({
        data: {
          tenantId,
          regulatoryRegisterId: input.regulatoryRegisterId,
          obligationCode: input.obligationCode,
          clauseReference: input.clauseReference,
          obligationDescription: input.obligationDescription,
          obligationType: input.obligationType,
          responsibleUserId: input.responsibleUserId,
          responsibleDepartmentId: input.responsibleDepartmentId,
          applicableSiteId: input.applicableSiteId,
          frequency: input.frequency,
          nextDueDate: input.nextDueDate,
          status: "ACTIVE",
          createdBy,
          updatedBy: createdBy,
        },
      });
    });
  }

  async update(obligationId: string, input: UpdateComplianceObligationInput): Promise<ComplianceObligation> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.complianceObligation.update({
        where: { id: obligationId },
        data: { ...input, updatedBy },
      }),
    );
  }

  async getById(obligationId: string): Promise<ComplianceObligation> {
    return this.prisma.withRls((tx) => tx.complianceObligation.findUniqueOrThrow({ where: { id: obligationId } }));
  }

  async listByRegister(regulatoryRegisterId: string): Promise<ComplianceObligation[]> {
    return this.prisma.withRls((tx) =>
      tx.complianceObligation.findMany({
        where: { regulatoryRegisterId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      }),
    );
  }

  /** PRD §2.2/§6 — obligation tidak lagi berlaku (mis. regulasi dicabut
   * tapi jejak historis evaluasi terkait tetap harus tersimpan) — status
   * RETIRED (BUKAN delete), pola sama IndustryTemplateService.deactivate()
   * (1.2)/DocumentService.retire() (2.1). */
  async retire(obligationId: string): Promise<ComplianceObligation> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.complianceObligation.update({
        where: { id: obligationId },
        data: { status: "RETIRED", updatedBy },
      }),
    );
  }
}
