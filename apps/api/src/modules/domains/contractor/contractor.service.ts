import { BadRequestException, Injectable } from "@nestjs/common";
import { Contractor, ContractorCategory, ContractorRiskRating, ContractorStatus, ContractorType } from "@prisma/client";
import { AuditLogService } from "../../../platform/audit-log/audit-log.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./contractor-context";
import { isBlacklistTransition } from "./contractor-lifecycle";

export interface CreateContractorInput {
  contractorName: string;
  contractorType: ContractorType;
  businessRegistrationNo?: string;
  businessLicenseType?: string;
  taxIdNpwp?: string;
  address?: string;
  city?: string;
  province?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  contractorCategory: ContractorCategory;
  parentContractorId?: string;
  overallRiskRating: ContractorRiskRating;
}

export type UpdateContractorInput = Partial<Omit<CreateContractorInput, "contractorCategory">>;

@Injectable()
export class ContractorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // §4.1 poin 1 — registrasi awal, status default REGISTERED.
  async create(input: CreateContractorInput): Promise<Contractor> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    return this.prisma.withRls((tx) =>
      tx.contractor.create({
        data: {
          tenantId,
          contractorName: input.contractorName,
          contractorType: input.contractorType,
          businessRegistrationNo: input.businessRegistrationNo,
          businessLicenseType: input.businessLicenseType,
          taxIdNpwp: input.taxIdNpwp,
          address: input.address,
          city: input.city,
          province: input.province,
          contactPersonName: input.contactPersonName,
          contactPersonPhone: input.contactPersonPhone,
          contactPersonEmail: input.contactPersonEmail,
          contractorCategory: input.contractorCategory,
          parentContractorId: input.parentContractorId,
          overallRiskRating: input.overallRiskRating,
          status: "REGISTERED",
          registeredAt: new Date(),
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async update(id: string, input: UpdateContractorInput): Promise<Contractor> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.contractor.update({
        where: { id },
        data: { ...input, updatedBy: actorUserId },
      }),
    );
  }

  // BR-06 — perubahan status MENJADI BLACKLISTED wajib approval HSE Manager
  // (ditegakkan CALLER via RBAC contractor.status.blacklist_approve, HANYA
  // role itu yang bisa memanggil path override) + alasan WAJIB diisi,
  // dicatat system_audit_logs — pola PERSIS BR-05 Calibration 6.2
  // (AuditLogService.recordStandalone(), bukan Workflow Engine terpisah,
  // PRD §6 tidak minta workflow formal utk transisi status ini).
  async updateStatus(id: string, newStatus: ContractorStatus, justification?: string): Promise<Contractor> {
    const actorUserId = requireActorUserId();

    if (isBlacklistTransition(newStatus)) {
      if (!justification) {
        throw new BadRequestException("BR-06 — perubahan status ke BLACKLISTED wajib menyertakan alasan (justifikasi).");
      }
      await this.auditLogService.recordStandalone({
        action: "BLACKLIST",
        entityType: "contractor",
        entityId: id,
        afterValue: { justification },
      });
    }

    return this.prisma.withRls((tx) => tx.contractor.update({ where: { id }, data: { status: newStatus, updatedBy: actorUserId } }));
  }

  async getById(id: string): Promise<Contractor> {
    return this.prisma.withRls((tx) => tx.contractor.findUniqueOrThrow({ where: { id } }));
  }

  async list(): Promise<Contractor[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.contractor.findMany({ where: { tenantId, deletedAt: null }, orderBy: { contractorName: "asc" } }));
  }
}
