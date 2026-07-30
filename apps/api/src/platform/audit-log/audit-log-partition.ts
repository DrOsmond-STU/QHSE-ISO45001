import { AUDIT_LOG_TABLE_NAME } from "./audit-log.constants";

export interface PartitionSpec {
  /** Nama tabel partisi, mis. "system_audit_logs_y2026m07". */
  tableName: string;
  /** Batas bawah PARTITION ... FOR VALUES FROM, format "YYYY-MM-DD" (inklusif). */
  rangeStartDate: string;
  /** Batas atas PARTITION ... FOR VALUES TO, format "YYYY-MM-DD" (eksklusif). */
  rangeEndDate: string;
}

// Pure function (unit-tested terpisah, pola sama numbering-pattern.ts 0.10 /
// workflow-sla-scan.ts 0.9) — dipakai AuditLogPartitionMaintenanceService
// untuk menghitung nama & rentang partisi bulanan system_audit_logs (TDD
// §6.1/§13.1). Semua perhitungan pakai method UTC (getUTCFullYear/
// getUTCMonth) supaya deterministik lintas environment/timezone sistem —
// nilai output tetap sekadar string tanggal polos ("YYYY-MM-DD") yang
// nantinya di-parse ulang oleh Postgres pakai timezone SESI-nya sendiri saat
// dieksekusi sebagai literal SQL (konsisten dengan migration init yang
// menulis literal yang sama apa adanya).
export function partitionSpecForMonth(monthDate: Date): PartitionSpec {
  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth(); // 0-indexed

  const rangeStart = new Date(Date.UTC(year, month, 1));
  const rangeEnd = new Date(Date.UTC(year, month + 1, 1));

  return {
    tableName: `${AUDIT_LOG_TABLE_NAME}_y${year}m${String(month + 1).padStart(2, "0")}`,
    rangeStartDate: toDateString(rangeStart),
    rangeEndDate: toDateString(rangeEnd),
  };
}

export function addMonthsUtc(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
