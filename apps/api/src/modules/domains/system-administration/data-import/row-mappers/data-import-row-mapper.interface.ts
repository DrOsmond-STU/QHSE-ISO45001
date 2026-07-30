// PRD Modul 31 §5 — target_module_code contoh literal: ORGANIZATION,
// EMPLOYEE, ASSET, DOCUMENT, TRAINING_CERTIFICATE, INCIDENT_HISTORY. Hanya
// EMPLOYEE yang py mapper konkret task 1.6 (lihat employee-row-mapper.ts) —
// modul lain BELUM py tabel domain target sama sekali (ASSET/DOCUMENT/
// TRAINING_CERTIFICATE/INCIDENT_HISTORY = Phase 2+) atau butuh keputusan
// desain terpisah (ORGANIZATION: company/site/department punya hierarki
// parent-child yang tidak bisa diwakili 1 baris flat Excel tanpa skema
// kolom tambahan) — didokumentasikan gap TDD §26, bukan oversight.
// Registry (data-import-row-mapper-registry.service.ts) dirancang supaya
// menambah mapper baru nanti CUMA butuh: (1) implement interface ini,
// (2) daftarkan providers array di data-import.module wiring — TIDAK ada
// perubahan DataImportService/DataImportProcessingService yang genuinely
// generic terhadap targetModuleCode.
export const DATA_IMPORT_ROW_MAPPERS = Symbol("DATA_IMPORT_ROW_MAPPERS");

export type RowValidationOutcome = { valid: true } | { valid: false; errorMessage: string };

export interface DataImportRowMapper {
  readonly targetModuleCode: string;
  /** Header kolom yang diharapkan di row pertama sheet (urutan bebas, dicocokkan by name bukan by index). */
  readonly columns: readonly string[];

  /**
   * Fase VALIDATING (TDD §20) — MURNI read-only, TIDAK BOLEH menyentuh
   * tabel domain apa pun (tidak ada query DB sama sekali idealnya).
   */
  validateRow(raw: Record<string, unknown>): RowValidationOutcome;

  /**
   * Fase IMPORTING — menulis SATU baris ke tabel domain target. SETIAP
   * panggilan berjalan dalam transaksi kecilnya SENDIRI (mis. via
   * UserService.inviteUser() yang sudah withRls()-nya sendiri) — BUKAN
   * bagian dari satu transaksi bersama seluruh batch. Ini deviasi
   * SENGAJA dari framing literal TDD §20 ("batch transaksi kecil, mis.
   * 500 baris per transaksi"): SAVEPOINT/ROLLBACK TO SAVEPOINT per-baris
   * di dalam satu transaksi bersama TERBUKTI bekerja lewat Prisma
   * interactive transaction (diverifikasi empiris sebelum keputusan ini
   * diambil), tapi dipilih TIDAK dipakai di sini supaya
   * UserService.inviteUser() (1.3, sudah teruji, py validasi
   * email-uniqueness/withCleanUniqueViolation sendiri) bisa dipakai APA
   * ADANYA tanpa dibongkar/diduplikasi logic-nya. Tujuan literal TDD §20
   * ("kegagalan di tengah tidak mengunci seluruh job/tabel lama") tetap
   * terpenuhi — transaksi per-baris malah scope lock-nya LEBIH KECIL
   * drpd transaksi per-500-baris. "Batching" 500 baris tetap ada, tapi di
   * level LOOP APLIKASI (progress tracking/chunking pembacaan stream),
   * bukan level transaksi DB. Gap ini dicatat TDD §26 utk mapper masa
   * depan yang MUNGKIN butuh SAVEPOINT sungguhan (mis. insert massal
   * tanpa lapisan service dgn transaksi sendiri).
   */
  importRow(raw: Record<string, unknown>): Promise<void>;
}
