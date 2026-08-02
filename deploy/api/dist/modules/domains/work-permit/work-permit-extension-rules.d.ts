/**
 * BR-07 (PRD Modul 06 §6), bagian pengajuan — "work_permit_extensions
 * hanya dapat diajukan sebelum planned_end_datetime terlampaui, maksimal
 * work_permit_types.max_extension_count kali." `existingExtensionCount`
 * dibaca sbg SELURUH baris `work_permit_extensions` utk permit ini
 * (PENDING+APPROVED+REJECTED — PRD tidak membedakan "percobaan" dari
 * "berhasil", "maksimal N kali" dibaca sbg batas jumlah PENGAJUAN, bukan
 * jumlah persetujuan).
 */
export declare function assertExtensionRequestAllowed(now: Date, plannedEndDatetime: Date, existingExtensionCount: number, maxExtensionCount: number): void;
