export declare const DATA_IMPORT_ROW_MAPPERS: unique symbol;
export type RowValidationOutcome = {
    valid: true;
} | {
    valid: false;
    errorMessage: string;
};
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
