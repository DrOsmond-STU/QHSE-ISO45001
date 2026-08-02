"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidCustomDomainFormat = isValidCustomDomainFormat;
// TDD §16 — customDomain dipakai LANGSUNG sbg pembanding hostname CORS
// (lihat platform/tenancy/tenant-cors-resolver.service.ts). Validasi
// format MINIMAL (bentuk hostname bertitik yg masuk akal) — bukan
// validator RFC-1035 penuh (mis. TIDAK mengecek keberadaan DNS record
// sungguhan/verifikasi kepemilikan domain, di luar cakupan literal PRD
// §13 Open Question #3 yang masih menyisakan status Phase-1-atau-ditunda).
const HOSTNAME_REGEX = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;
function isValidCustomDomainFormat(domain) {
    return HOSTNAME_REGEX.test(domain.toLowerCase());
}
