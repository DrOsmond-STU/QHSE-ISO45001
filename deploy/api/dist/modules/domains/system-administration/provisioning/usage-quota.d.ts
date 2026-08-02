export interface QuotaCheckInput {
    metricType: "ACTIVE_USERS" | "ACTIVE_SITES";
    currentValue: number;
    maxValue: number | null;
}
export interface QuotaCheckResult extends QuotaCheckInput {
    exceeded: boolean;
}
/** maxValue NULL = unlimited (PRD literal "NULL = unlimited") — tidak
 * pernah exceeded. */
export declare function checkQuota(input: QuotaCheckInput): QuotaCheckResult;
