import { Injectable } from "@nestjs/common";
import { ContractorComplianceDocumentCategory, ContractorDocumentCompliance } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./contractor-context";
import { hasBlockingExpiredCompliance, isComplianceExpired } from "./contractor-lifecycle";

export interface RegisterComplianceDocumentInput {
  contractorId: string;
  documentCategory: ContractorComplianceDocumentCategory;
  documentId?: string;
  documentNumber?: string;
  issuedBy?: string;
  issueDate?: Date;
  expiryDate: Date;
  reminderDaysBefore?: number;
  isMandatoryForPtk007?: boolean;
}

@Injectable()
export class ContractorDocumentComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  // §4.2 poin 1 — dokumen wajib berkelanjutan dicatat dgn expiry_date.
  // status dihitung SAAT create() (bukan hanya via scan) — kalau
  // expiryDate SUDAH lewat di titik pendaftaran (data migrasi/entri
  // terlambat), status langsung EXPIRED, bukan menunggu scan job harian
  // berikutnya.
  async register(input: RegisterComplianceDocumentInput): Promise<ContractorDocumentCompliance> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();
    const status = isComplianceExpired(input.expiryDate, new Date()) ? "EXPIRED" : "VALID";

    return this.prisma.withRls((tx) =>
      tx.contractorDocumentCompliance.create({
        data: {
          tenantId,
          contractorId: input.contractorId,
          documentCategory: input.documentCategory,
          documentId: input.documentId,
          documentNumber: input.documentNumber,
          issuedBy: input.issuedBy,
          issueDate: input.issueDate,
          expiryDate: input.expiryDate,
          reminderDaysBefore: input.reminderDaysBefore ?? 30,
          isMandatoryForPtk007: input.isMandatoryForPtk007 ?? false,
          status,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  // §4.2 poin 1 (RENEWAL_IN_PROGRESS) — Contractor Coordinator menandai
  // proses perpanjangan sedang berjalan (PRD §5 sediakan nilai enum ini
  // TANPA prosa §4.2 menjelaskan transisi kapan — dibaca sbg override
  // manual sebelum expiryDate baru genuinely tersedia, gap TDD §26).
  async markRenewalInProgress(id: string): Promise<ContractorDocumentCompliance> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) => tx.contractorDocumentCompliance.update({ where: { id }, data: { status: "RENEWAL_IN_PROGRESS", updatedBy: actorUserId } }));
  }

  // Dipanggil setelah renewal selesai — expiry_date baru + reset idempotency
  // kolom reminder (BERPUTAR ULANG, pola sama Calibration/Asset — kolom
  // reminderSentAt/expiredNotifiedAt WAJIB null lagi utk siklus berikutnya).
  async renew(id: string, newExpiryDate: Date): Promise<ContractorDocumentCompliance> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.contractorDocumentCompliance.update({
        where: { id },
        data: {
          expiryDate: newExpiryDate,
          status: "VALID",
          reminderSentAt: null,
          expiredNotifiedAt: null,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  // BR-02 — dipanggil WorkPermitService sebelum create/submit permit dgn
  // contractorCompanyId terisi.
  async hasBlockingExpiredCompliance(contractorId: string): Promise<boolean> {
    const records = await this.prisma.withRls((tx) =>
      tx.contractorDocumentCompliance.findMany({ where: { contractorId, deletedAt: null }, select: { status: true } }),
    );
    return hasBlockingExpiredCompliance(records.map((r) => r.status));
  }

  async listByContractor(contractorId: string): Promise<ContractorDocumentCompliance[]> {
    return this.prisma.withRls((tx) => tx.contractorDocumentCompliance.findMany({ where: { contractorId, deletedAt: null } }));
  }

  async getById(id: string): Promise<ContractorDocumentCompliance> {
    return this.prisma.withRls((tx) => tx.contractorDocumentCompliance.findUniqueOrThrow({ where: { id } }));
  }
}
