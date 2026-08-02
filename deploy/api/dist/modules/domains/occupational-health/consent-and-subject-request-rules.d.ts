export declare const DEFAULT_MEDICAL_RECORD_MINIMUM_RETENTION_DAYS: number;
export interface ErasureEligibilityInput {
    lastRecordActivityDate: Date;
    requestDate: Date;
    minimumRetentionDays?: number;
}
export interface ErasureEligibilityResult {
    eligible: boolean;
    rejectionReason?: string;
}
export declare function canProcessErasureRequest(input: ErasureEligibilityInput): ErasureEligibilityResult;
