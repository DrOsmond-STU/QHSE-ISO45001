// BR-06 (PRD Modul 07 §5 "Formula perhitungan") — basis rate_base_hours_used
// configurable per tenant (disarankan 1.000.000, wajib dikonfirmasi
// kebijakan tenant per §13 Open Question #1); caller menyuplai nilai
// basisnya, fungsi ini murni menghitung. totalManhoursWorked=0 (belum ada
// input manhours periode ybs) mengembalikan 0 utk ketiga rate, BUKAN
// NaN/Infinity (pembagian nol) — NUMERIC(10,4) Postgres akan menolak
// keduanya kalau ditulis apa adanya.
export interface IncidentRateInput {
  ltiCount: number;
  restrictedWorkCount: number;
  medicalTreatmentCount: number;
  totalDaysLost: number;
  totalManhoursWorked: number;
  rateBaseHoursUsed: number;
}

export function calculateLtifr(input: IncidentRateInput): number {
  if (input.totalManhoursWorked === 0) return 0;
  return (input.ltiCount * input.rateBaseHoursUsed) / input.totalManhoursWorked;
}

// PRD §5 literal formula HANYA menjumlahkan LTI+Restricted Work Case+Medical
// Treatment Case sbg "recordable" — TIDAK menyertakan Fatality (beda dari
// TRIR gaya OSHA standar yang lazimnya menghitung fatality sbg recordable
// juga) — diimplementasikan PERSIS teks PRD, kejanggalan didokumentasikan
// TDD §26 alih-alih diam-diam "dikoreksi".
export function calculateTrir(input: IncidentRateInput): number {
  if (input.totalManhoursWorked === 0) return 0;
  const recordableCount = input.ltiCount + input.restrictedWorkCount + input.medicalTreatmentCount;
  return (recordableCount * input.rateBaseHoursUsed) / input.totalManhoursWorked;
}

export function calculateSeverityRate(input: Pick<IncidentRateInput, "totalDaysLost" | "totalManhoursWorked" | "rateBaseHoursUsed">): number {
  if (input.totalManhoursWorked === 0) return 0;
  return (input.totalDaysLost * input.rateBaseHoursUsed) / input.totalManhoursWorked;
}
