import { PrismaService } from "../tenancy/prisma.service";
export interface GenerateNextOptions {
    /** Site/company UUID mentah (tanpa FK, lihat banner comment schema.prisma
     * "Task 0.10") — wajib diisi kalau baris numbering_configs terkait
     * scope_level COMPANY/SITE, dibiarkan kosong kalau TENANT. */
    scopeId?: string;
    /** Token pattern yang tidak bisa diresolusi service ini sendiri, mis.
     * {SITE_CODE}/{COMPANY_CODE} — lihat numbering-pattern.ts. */
    variables?: Record<string, string>;
}
export declare class NumberingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    /**
     * Master PRD §10 — generate nomor dokumen/record legal berikutnya untuk
     * `moduleCode` (mis. WORK_PERMIT/INCIDENT/CAPA). Atomic: row lock
     * (`SELECT ... FOR UPDATE`) di dalam transaksi RLS yang sama supaya
     * submission konkuren TIDAK PERNAH menghasilkan nomor duplikat (TESTING
     * §6) — panggilan kedua yang konkuren blok di lock sampai panggilan
     * pertama commit, baru baca last_sequence yang sudah ter-update.
     *
     * Reset periode (YEARLY/MONTHLY) dievaluasi tiap panggilan (bandingkan
     * computePeriodKey sekarang vs baris tersimpan) — kalau beda, sequence
     * reset ke 1 alih-alih lanjut, dan lastPeriodKey baris di-update.
     *
     * Render pattern (bisa throw kalau ada token tak dikenal/variables
     * kurang) SENGAJA dijalankan SEBELUM tx.numberingConfig.update() —
     * kegagalan render tidak boleh "membakar" nomor urut (row lock + seluruh
     * transaksi otomatis rollback kalau exception dilempar sebelum commit).
     *
     * TIDAK ada dedup/idempotency-key eksplisit di sini per desain: caller
     * (modul domain) yang punya kolom nomor nullable di record-nya sendiri
     * (mis. `work_permits.permit_number`) bertanggung jawab tidak memanggil
     * ulang generateNext() untuk record yang SUDAH punya nomor — sama seperti
     * WorkflowEngineService.startInstance() (task 0.9) tidak dedup sendiri
     * terhadap entityId yang sama. Idempotency HTTP-level (`Idempotency-Key`
     * header, TDD §7.1) juga tanggung jawab endpoint POST modul domain, bukan
     * service platform generik ini.
     */
    generateNext(moduleCode: string, options?: GenerateNextOptions): Promise<string>;
}
