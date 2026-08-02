import { LicenseHolderType, LicensePermit, LicenseType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
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
export declare class LicensePermitService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateLicensePermitInput): Promise<LicensePermit>;
    update(licenseId: string, input: UpdateLicensePermitInput): Promise<LicensePermit>;
    getById(licenseId: string): Promise<LicensePermit>;
    listByHolder(holderType: LicenseHolderType, holderReferenceId: string): Promise<LicensePermit[]>;
    /** PRD §4.3 poin 2 — "Compliance Officer mengunggah bukti pengajuan
     * perpanjangan → status = IN_RENEWAL_PROCESS." Upload bukti ITU SENDIRI
     * (attachments generik, 0.12) SENGAJA TIDAK diwire di sini — PRD §5 tidak
     * memberi entity_type/kolom baku utk lampiran ini pada licenses_permits
     * (beda dari document_versions yang py kolom file eksplisit), jadi
     * disederhanakan jadi transisi status murni (gap TDD §26, caller boleh
     * menyimpan bukti via AttachmentService generik dgn entityType/entityId
     * mengarah ke license ini kalau diperlukan nanti). */
    markInRenewalProcess(licenseId: string): Promise<LicensePermit>;
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
    createRenewal(oldLicenseId: string, input: CreateLicenseRenewalInput): Promise<LicensePermit>;
    /** Authority-initiated (BUKAN kedaluwarsa alami, itu BR-02/job) —
     * pencabutan izin, mis. pelanggaran. Pola sama RegulatoryRegisterService.retire(). */
    revoke(licenseId: string): Promise<LicensePermit>;
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
    findExpiredSioCertifications(holderReferenceId: string): Promise<LicensePermit[]>;
}
