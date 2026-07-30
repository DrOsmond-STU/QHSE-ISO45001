import { EmergencyActivationStatus } from "@prisma/client";

// ACTIVE->ALL_CLEAR_DECLARED = jalur normal (situasi aman, all_clear_datetime
// diisi). ACTIVE->STOOD_DOWN = dibatalkan/false alarm TANPA all-clear formal
// (mis. drill dihentikan lebih awal). Keduanya TERMINAL — sekali diaktivasi
// selesai, tidak ada jalur balik ke ACTIVE (aktivasi BARU dibuat, bukan
// baris yang sama dipakai ulang).
const ALLOWED_TRANSITIONS: Record<EmergencyActivationStatus, EmergencyActivationStatus[]> = {
  ACTIVE: ["ALL_CLEAR_DECLARED", "STOOD_DOWN"],
  ALL_CLEAR_DECLARED: [],
  STOOD_DOWN: [],
};

export function validateEmergencyActivationStatusTransition(from: EmergencyActivationStatus, to: EmergencyActivationStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi emergency_activations.status dari ${from} ke ${to} tidak valid.`);
  }
}

// BR-07 — "missing_person_count ... total_expected_headcount -
// total_checked_in_count, BERSIFAT ESTIMASI" — total_expected_headcount
// ITU SENDIRI estimasi manual Incident Commander (§13 Open Question #1,
// TIDAK ada integrasi access-control fisik) — nilai kembalian fungsi ini
// TIDAK PERNAH dianggap otoritatif, caller (UI/API response) WAJIB
// menampilkan disclaimer eksplisit (PRD §12 wireframe note), bukan
// tanggung jawab fungsi murni ini.
export function computeMissingPersonCount(totalExpectedHeadcount: number | null, totalCheckedInCount: number): number | null {
  if (totalExpectedHeadcount === null) return null;
  return Math.max(0, totalExpectedHeadcount - totalCheckedInCount);
}
