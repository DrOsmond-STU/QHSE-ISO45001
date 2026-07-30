/**
 * BR-07 (PRD Modul 06 §6), bagian pengajuan — "work_permit_extensions
 * hanya dapat diajukan sebelum planned_end_datetime terlampaui, maksimal
 * work_permit_types.max_extension_count kali." `existingExtensionCount`
 * dibaca sbg SELURUH baris `work_permit_extensions` utk permit ini
 * (PENDING+APPROVED+REJECTED — PRD tidak membedakan "percobaan" dari
 * "berhasil", "maksimal N kali" dibaca sbg batas jumlah PENGAJUAN, bukan
 * jumlah persetujuan).
 */
export function assertExtensionRequestAllowed(now: Date, plannedEndDatetime: Date, existingExtensionCount: number, maxExtensionCount: number): void {
  if (now.getTime() >= plannedEndDatetime.getTime()) {
    throw new Error("work_permit_extensions hanya dapat diajukan sebelum planned_end_datetime terlampaui (BR-07).");
  }
  if (existingExtensionCount >= maxExtensionCount) {
    throw new Error(`work_permit_extensions sudah mencapai batas maksimum (${maxExtensionCount}x) untuk permit ini (BR-07).`);
  }
}
