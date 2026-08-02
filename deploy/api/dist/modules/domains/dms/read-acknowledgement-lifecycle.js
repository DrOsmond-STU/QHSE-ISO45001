"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAcknowledgementTransition = validateAcknowledgementTransition;
// BR-04 (PRD §6): "read_acknowledgement_logs.status tidak dapat langsung
// ACKNOWLEDGED tanpa melewati VIEWED terlebih dahulu, KECUALI metode
// E_SIGNATURE yang mensyaratkan pembacaan penuh sebelum submit tanda tangan
// — tervalidasi di level UI/proses" — utk E_SIGNATURE, langsung ke
// ACKNOWLEDGED DIIZINKAN di sini (backend TIDAK bisa memverifikasi
// "pembacaan penuh" itu sendiri, itu tanggung jawab alur e-signature
// provider yang belum ada — Modul 30, gap TDD §26); utk IN_APP_CLICK,
// VIEWED WAJIB dilewati dulu.
//
// OVERDUE SENGAJA TIDAK diperlakukan terminal (BEYOND diagram literal PRD
// §5 "PENDING -> VIEWED -> ACKNOWLEDGED, atau PENDING/VIEWED -> OVERDUE" —
// diagram itu tidak eksplisit melarang late-acknowledgement) — memblokir
// user yang sudah OVERDUE dari mengakui bacaannya SELAMANYA kontraproduktif
// utk tujuan modul ini (bukti kepatuhan ISO 45001 §7.5): pengakuan
// terlambat tetap bukti lebih baik drpd tidak ada sama sekali. Keputusan
// interpretasi didokumentasikan TDD §26.
function validateAcknowledgementTransition(from, to, method) {
    if ((from === "PENDING" || from === "OVERDUE") && to === "VIEWED")
        return;
    if ((from === "VIEWED" || from === "OVERDUE") && to === "ACKNOWLEDGED")
        return;
    if (from === "PENDING" && to === "ACKNOWLEDGED" && method === "E_SIGNATURE")
        return;
    if ((from === "PENDING" || from === "VIEWED") && to === "OVERDUE")
        return;
    throw new Error(`Transisi read_acknowledgement_logs.status dari ${from} ke ${to} (method=${method ?? "null"}) tidak valid (BR-04).`);
}
//# sourceMappingURL=read-acknowledgement-lifecycle.js.map