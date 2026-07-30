// TDD §16 — CORS whitelist per tenant custom domain, tidak wildcard.
// Fungsi murni: ekstrak hostname dari header Origin browser (mis.
// "https://acme.qhse.example.com:3000" -> "acme.qhse.example.com").
// Origin header BUKAN input tepercaya (browser mengirim apa pun yang
// diklaim halaman pemanggil) — parsing WAJIB gagal aman (null), bukan
// throw, supaya caller (TenantCorsResolverService) bisa menolak origin
// aneh tanpa menjatuhkan request preflight.
export function extractOriginHostname(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}
