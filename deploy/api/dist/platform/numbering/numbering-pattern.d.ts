import { NumberingResetPeriod } from "@prisma/client";
/**
 * Master PRD §10 — reset_period YEARLY/MONTHLY butuh cara mendeteksi "sudah
 * ganti periode belum" supaya generateNext() tahu kapan me-reset
 * lastSequence ke 0 (lihat banner comment "Task 0.10" di schema.prisma).
 * String key (bukan simpan/bandingkan tanggal) supaya perbandingannya cukup
 * `===`, tidak perlu logika kalender di caller. NEVER -> null (tidak pernah
 * reset). Selalu UTC supaya deterministik lintas timezone server.
 */
export declare function computePeriodKey(resetPeriod: NumberingResetPeriod, now: Date): string | null;
export interface RenderNumberPatternParams {
    prefix: string;
    sequence: number;
    now: Date;
    /**
     * Token pattern yang TIDAK bisa diresolusi NumberingService sendiri (mis.
     * {SITE_CODE}/{COMPANY_CODE}/{DEPT_CODE} — datanya ada di Modul 01 yang
     * belum ada di Phase 0) disuplai caller (modul domain). Numbering Service
     * tetap generik, tidak perlu tahu apa itu "site".
     */
    variables?: Record<string, string>;
}
/**
 * Master PRD §10 — render pattern seperti `{PREFIX}/{SITE_CODE}/{YYYY}/{SEQ:4}`
 * jadi nomor dokumen sungguhan, mis. `INC/JKT-01/2026/0001`. Token yang
 * diresolusi Numbering Service sendiri (murni fungsi tanggal/sequence, tidak
 * bergantung modul lain): {PREFIX} {YYYY} {MM} {QUARTER} {YYYYMMDD}
 * {SEQ:n} (n = lebar zero-padding, WAJIB, mis. {SEQ:4} -> "0001"). Token
 * lain di luar daftar itu HARUS ada di `variables`, kalau tidak generateNext
 * gagal eksplisit (fail loud) — bukan diam-diam meninggalkan literal
 * "{TOKEN}" di nomor dokumen legal.
 */
export declare function renderNumberPattern(pattern: string, params: RenderNumberPatternParams): string;
