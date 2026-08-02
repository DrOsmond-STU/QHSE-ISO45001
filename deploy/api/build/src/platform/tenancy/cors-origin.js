"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractOriginHostname = extractOriginHostname;
// TDD §16 — CORS whitelist per tenant custom domain, tidak wildcard.
// Fungsi murni: ekstrak hostname dari header Origin browser (mis.
// "https://acme.qhse.example.com:3000" -> "acme.qhse.example.com").
// Origin header BUKAN input tepercaya (browser mengirim apa pun yang
// diklaim halaman pemanggil) — parsing WAJIB gagal aman (null), bukan
// throw, supaya caller (TenantCorsResolverService) bisa menolak origin
// aneh tanpa menjatuhkan request preflight.
function extractOriginHostname(origin) {
    try {
        return new URL(origin).hostname.toLowerCase();
    }
    catch {
        return null;
    }
}
