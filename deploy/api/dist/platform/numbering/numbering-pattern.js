"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computePeriodKey = computePeriodKey;
exports.renderNumberPattern = renderNumberPattern;
// Pure logic — tanpa Prisma/DB, mirror gaya workflow-transition-evaluation.ts.
// Caller (NumberingService) yang baca/tulis state row-locked ke DB dan
// panggil fungsi-fungsi ini.
/**
 * Master PRD §10 — reset_period YEARLY/MONTHLY butuh cara mendeteksi "sudah
 * ganti periode belum" supaya generateNext() tahu kapan me-reset
 * lastSequence ke 0 (lihat banner comment "Task 0.10" di schema.prisma).
 * String key (bukan simpan/bandingkan tanggal) supaya perbandingannya cukup
 * `===`, tidak perlu logika kalender di caller. NEVER -> null (tidak pernah
 * reset). Selalu UTC supaya deterministik lintas timezone server.
 */
function computePeriodKey(resetPeriod, now) {
    const year = now.getUTCFullYear();
    if (resetPeriod === "YEARLY")
        return String(year);
    if (resetPeriod === "MONTHLY")
        return `${year}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    return null; // NEVER
}
const TOKEN_PATTERN = /\{([A-Z_]+)(?::(\d+))?\}/g;
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
function renderNumberPattern(pattern, params) {
    const year = params.now.getUTCFullYear();
    const month = params.now.getUTCMonth() + 1;
    const day = params.now.getUTCDate();
    const quarter = Math.floor((month - 1) / 3) + 1;
    const dateTokens = {
        YYYY: String(year),
        MM: String(month).padStart(2, "0"),
        QUARTER: String(quarter),
        YYYYMMDD: `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
    };
    return pattern.replace(TOKEN_PATTERN, (_whole, name, width) => {
        if (name === "PREFIX")
            return params.prefix;
        if (name === "SEQ") {
            if (!width) {
                throw new Error(`Token {SEQ} pada pattern "${pattern}" wajib punya lebar padding, mis. {SEQ:4}.`);
            }
            return String(params.sequence).padStart(Number(width), "0");
        }
        if (name in dateTokens)
            return dateTokens[name];
        const fromVariables = params.variables?.[name];
        if (fromVariables === undefined) {
            throw new Error(`Token {${name}} pada pattern "${pattern}" tidak dikenali dan tidak disuplai lewat variables.`);
        }
        return fromVariables;
    });
}
//# sourceMappingURL=numbering-pattern.js.map