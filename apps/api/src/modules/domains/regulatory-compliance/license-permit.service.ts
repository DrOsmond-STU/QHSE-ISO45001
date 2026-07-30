import { BadRequestException, Injectable } from "@nestjs/common";
import { LicenseHolderType, LicensePermit, LicenseStatus, LicenseType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./regulatory-compliance-context";

export interface CreateLicensePermitInput {
  licenseNumber: string;
  licenseName: string;
  licenseType: LicenseType;
  issuingAuthority?: string;
  regulatoryRegisterId?: string;
  companyId?: string;
  siteId?: string;
  holderType: LicenseHolderType;
  holderReferenceId?: string;
  issueDate: Date;
  expiryDate?: Date;
  renewalLeadTimeDays?: number;
}

export interface UpdateLicensePermitInput {
  licenseName?: string;
  issuingAuthority?: string;
  expiryDate?: Date;
  renewalLeadTimeDays?: number;
}

export interface CreateLicenseRenewalInput {
  licenseNumber: string;
  issueDate: Date;
  expiryDate?: Date;
  issuingAuthority?: string;
}

const RENEWABLE_STATUSES: LicenseStatus[] = ["ACTIVE", "EXPIRING_SOON", "IN_RENEWAL_PROCESS", "EXPIRED"];

// Task 2.2 (Modul 04 §4.3/§5/§6 BR-05). BELUM ada controller HTTP (pola
// sama seluruh modul domain Phase 2 sejauh ini) — compliance.license.*
// sudah di-seed RBAC baseline (task 92). license_number TIDAK memakai
// NumberingService (PRD §5 "Numbering & Attachments" eksplisit: "ditentukan
// otoritas penerbit eksternal, bukan sistem internal") — BEDA dari
// ComplianceEvaluationService, nomor mentah dari input caller.
@Injectable()
export class LicensePermitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateLicensePermitInput): Promise<LicensePermit> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls((tx) =>
      tx.licensePermit.create({
        data: {
          tenantId,
          licenseNumber: input.licenseNumber,
          licenseName: input.licenseName,
          licenseType: input.licenseType,
          issuingAuthority: input.issuingAuthority,
          regulatoryRegisterId: input.regulatoryRegisterId,
          companyId: input.companyId,
          siteId: input.siteId,
          holderType: input.holderType,
          holderReferenceId: input.holderReferenceId,
          issueDate: input.issueDate,
          expiryDate: input.expiryDate,
          renewalLeadTimeDays: input.renewalLeadTimeDays ?? 90,
          status: "ACTIVE",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async update(licenseId: string, input: UpdateLicensePermitInput): Promise<LicensePermit> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.licensePermit.update({
        where: { id: licenseId },
        data: { ...input, updatedBy },
      }),
    );
  }

  async getById(licenseId: string): Promise<LicensePermit> {
    return this.prisma.withRls((tx) => tx.licensePermit.findUniqueOrThrow({ where: { id: licenseId } }));
  }

  async listByHolder(holderType: LicenseHolderType, holderReferenceId: string): Promise<LicensePermit[]> {
    return this.prisma.withRls((tx) =>
      tx.licensePermit.findMany({
        where: { holderType, holderReferenceId, deletedAt: null },
        orderBy: { issueDate: "desc" },
      }),
    );
  }

  /** PRD §4.3 poin 2 — "Compliance Officer mengunggah bukti pengajuan
   * perpanjangan → status = IN_RENEWAL_PROCESS." Upload bukti ITU SENDIRI
   * (attachments generik, 0.12) SENGAJA TIDAK diwire di sini — PRD §5 tidak
   * memberi entity_type/kolom baku utk lampiran ini pada licenses_permits
   * (beda dari document_versions yang py kolom file eksplisit), jadi
   * disederhanakan jadi transisi status murni (gap TDD §26, caller boleh
   * menyimpan bukti via AttachmentService generik dgn entityType/entityId
   * mengarah ke license ini kalau diperlukan nanti). */
  async markInRenewalProcess(licenseId: string): Promise<LicensePermit> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const existing = await tx.licensePermit.findUniqueOrThrow({ where: { id: licenseId } });
      if (existing.status !== "ACTIVE" && existing.status !== "EXPIRING_SOON") {
        throw new BadRequestException(
          `licenses_permits berstatus ${existing.status} tidak dapat diajukan perpanjangan (wajib ACTIVE/EXPIRING_SOON).`,
        );
      }
      return tx.licensePermit.update({ where: { id: licenseId }, data: { status: "IN_RENEWAL_PROCESS", updatedBy } });
    });
  }

  /**
   * PRD §4.3 poin 3 — "Izin baru terbit → dibuat baris licenses_permits
   * baru dengan renewal_of_license_id menunjuk izin lama." Baris LAMA
   * SENGAJA TIDAK dipaksa pindah status ("izin lama -> status ACTIVE
   * diubah menjadi status historis" dibaca sbg deskripsi HASIL bukan
   * instruksi FSM literal — licenses_permits.status skema §5 CUMA py 5
   * nilai (ACTIVE/EXPIRING_SOON/EXPIRED/REVOKED/IN_RENEWAL_PROCESS), TIDAK
   * ADA nilai "historis"/"SUPERSEDED" tersendiri, dan diagram transisi PRD
   * §5 sendiri baris "Status Lifecycle" TIDAK menyebut edge ini sama
   * sekali — "historis" di sini berarti STRUKTURAL lewat rantai
   * renewal_of_license_id/renewedByLicense, bukan perubahan enum. Baris
   * lama biasanya SUDAH IN_RENEWAL_PROCESS dari markInRenewalProcess(),
   * status itu dibiarkan apa adanya, gap TDD §26). renewalOfLicenseId
   * UNIQUE (skema) menegakkan satu izin lama hanya bisa py SATU penerus.
   */
  async createRenewal(oldLicenseId: string, input: CreateLicenseRenewalInput): Promise<LicensePermit> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const old = await tx.licensePermit.findUniqueOrThrow({ where: { id: oldLicenseId } });
      if (!RENEWABLE_STATUSES.includes(old.status)) {
        throw new BadRequestException(`licenses_permits berstatus ${old.status} tidak dapat diperpanjang (wajib bukan REVOKED).`);
      }

      return tx.licensePermit.create({
        data: {
          tenantId,
          licenseNumber: input.licenseNumber,
          licenseName: old.licenseName,
          licenseType: old.licenseType,
          issuingAuthority: input.issuingAuthority ?? old.issuingAuthority,
          regulatoryRegisterId: old.regulatoryRegisterId,
          companyId: old.companyId,
          siteId: old.siteId,
          holderType: old.holderType,
          holderReferenceId: old.holderReferenceId,
          issueDate: input.issueDate,
          expiryDate: input.expiryDate,
          renewalLeadTimeDays: old.renewalLeadTimeDays,
          renewalOfLicenseId: old.id,
          status: "ACTIVE",
          createdBy,
          updatedBy: createdBy,
        },
      });
    });
  }

  /** Authority-initiated (BUKAN kedaluwarsa alami, itu BR-02/job) —
   * pencabutan izin, mis. pelanggaran. Pola sama RegulatoryRegisterService.retire(). */
  async revoke(licenseId: string): Promise<LicensePermit> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const existing = await tx.licensePermit.findUniqueOrThrow({ where: { id: licenseId } });
      if (existing.status === "REVOKED") {
        throw new BadRequestException(`licenses_permits ${licenseId} sudah REVOKED.`);
      }
      return tx.licensePermit.update({ where: { id: licenseId }, data: { status: "REVOKED", updatedBy } });
    });
  }

  /**
   * BR-05 (PRD §6) — "licenses_permits dengan holder_type=SIO_OPERATOR_CERT
   * yang status=EXPIRED memblokir individu terkait dari penugasan pekerjaan
   * yang mensyaratkan sertifikasi tersebut — validasi silang dengan Modul
   * 06 (Work Permit)/Modul 19 (Training & Competency)." Teks PRD menyebut
   * "holder_type=SIO_OPERATOR_CERT" tapi SIO_OPERATOR_CERT ADALAH nilai
   * license_type (skema §5 kolom holder_type CUMA
   * COMPANY/SITE/EQUIPMENT/INDIVIDUAL) — dibaca sbg licenseType=
   * SIO_OPERATOR_CERT (holderType=INDIVIDUAL implisit, satu-satunya yang
   * masuk akal utk sertifikasi personal, TIDAK dipaksa sbg filter supaya
   * data yang lupa mengisi holder_type tetap kena deteksi). KEDUA modul
   * (06/19) BELUM ADA di codebase ini (Phase 2+ lain) — helper QUERY-ONLY
   * ini mengembalikan daftar sertifikasi EXPIRED milik holder, SIAP
   * dipanggil modul itu nanti sbg validasi silang; tidak ada enforcement
   * APAPUN yang benar-benar terjadi di sini (tidak ada "penugasan
   * pekerjaan" utk diblokir, gap TDD §26).
   */
  async findExpiredSioCertifications(holderReferenceId: string): Promise<LicensePermit[]> {
    return this.prisma.withRls((tx) =>
      tx.licensePermit.findMany({
        where: { licenseType: "SIO_OPERATOR_CERT", holderReferenceId, status: "EXPIRED", deletedAt: null },
        orderBy: { expiryDate: "desc" },
      }),
    );
  }
}
