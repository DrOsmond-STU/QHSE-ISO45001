import { SiteCategory, SiteStatus, SiteType } from "@prisma/client";

export class SiteLifecycleError extends Error {}

// PRD Modul 01 §6 BR-01 — "sites.start_date wajib diisi jika site_type =
// PROJECT; end_date boleh kosong saat pembuatan tapi wajib terisi sebelum
// status diubah ke ARCHIVED." Pure/sync — dipanggil service SEBELUM
// create/update, unit-tested terpisah dari DB.
export function validateSiteLifecycle(input: {
  siteType: SiteType;
  startDate: Date | null;
  endDate: Date | null;
  status: SiteStatus;
}): void {
  if (input.siteType === "PROJECT" && !input.startDate) {
    throw new SiteLifecycleError("BR-01: start_date wajib diisi untuk site dengan site_type PROJECT.");
  }
  if (input.status === "ARCHIVED" && !input.endDate) {
    throw new SiteLifecycleError("BR-01: end_date wajib diisi sebelum site diarsipkan (status ARCHIVED).");
  }
}

// PRD Modul 01 §6 BR-08 — kategori site berisiko tinggi DIREKOMENDASIKAN
// mengisi geo_lat/geo_long ("tidak hard block, hanya warning UI") — fungsi
// ini TIDAK throw, cuma sinyal warning yang caller (endpoint/UI masa depan)
// pilih tampilkan atau tidak.
const HIGH_RISK_SITE_CATEGORIES: ReadonlySet<SiteCategory> = new Set(["RIG", "MINE_SITE", "CONSTRUCTION_SITE"]);

export function shouldWarnMissingGeoCoordinates(category: SiteCategory, geoLat: unknown, geoLong: unknown): boolean {
  return HIGH_RISK_SITE_CATEGORIES.has(category) && (geoLat === null || geoLat === undefined || geoLong === null || geoLong === undefined);
}
