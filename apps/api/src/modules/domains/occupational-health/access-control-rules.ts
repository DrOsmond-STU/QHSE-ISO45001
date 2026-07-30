import { OhAuthorizationStatus } from "@prisma/client";

export interface AuthorizedUserRow {
  status: OhAuthorizationStatus;
  expiryDate: Date | null;
  revokedAt: Date | null;
}

// BR-02 bagian (b) — "entri AKTIF (status ACTIVE, belum expired) di tabel
// whitelist occupational_health_authorized_users." status=ACTIVE saja
// TIDAK CUKUP kalau expiryDate sudah lewat ATAU sudah di-revoke — kedua
// kondisi itu independen dari kolom status (operator admin bisa lupa
// transisi status ke EXPIRED/REVOKED tepat waktu, jadi dicek langsung dari
// data mentah, bukan percaya kolom status semata — fail closed).
export function isAuthorizationActive(row: AuthorizedUserRow, asOfDate: Date): boolean {
  if (row.status !== "ACTIVE") {
    return false;
  }
  if (row.revokedAt !== null) {
    return false;
  }
  if (row.expiryDate !== null && row.expiryDate.getTime() < asOfDate.getTime()) {
    return false;
  }
  return true;
}
