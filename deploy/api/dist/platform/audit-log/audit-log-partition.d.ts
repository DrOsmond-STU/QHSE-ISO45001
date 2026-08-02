export interface PartitionSpec {
    /** Nama tabel partisi, mis. "system_audit_logs_y2026m07". */
    tableName: string;
    /** Batas bawah PARTITION ... FOR VALUES FROM, format "YYYY-MM-DD" (inklusif). */
    rangeStartDate: string;
    /** Batas atas PARTITION ... FOR VALUES TO, format "YYYY-MM-DD" (eksklusif). */
    rangeEndDate: string;
}
export declare function partitionSpecForMonth(monthDate: Date): PartitionSpec;
export declare function addMonthsUtc(date: Date, months: number): Date;
