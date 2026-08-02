"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertRequesterNotApprover = assertRequesterNotApprover;
/**
 * BR-09 (PRD Modul 06 §6) — "Requester tidak boleh menjadi approver pada
 * permit miliknya sendiri (segregation of duty), kecuali dikonfigurasi
 * lain secara eksplisit oleh Tenant Admin untuk site berskala kecil
 * (dicatat sebagai pengecualian berisiko)." "Kecuali dikonfigurasi lain"
 * TIDAK diimplementasikan — TIDAK ADA kolom skema literal Modul 06 §5
 * utk menyimpan pengecualian per-tenant/per-site itu (gap TDD §26), jadi
 * fungsi ini SELALU menegakkan aturan inti tanpa override.
 */
function assertRequesterNotApprover(requesterId, actingUserId) {
    if (requesterId === actingUserId) {
        throw new Error("Requester tidak dapat menjadi approver pada permit miliknya sendiri (BR-09).");
    }
}
