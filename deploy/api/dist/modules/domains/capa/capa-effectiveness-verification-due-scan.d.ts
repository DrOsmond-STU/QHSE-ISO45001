export interface CapaEffectivenessVerificationDueCandidate {
    effectivenessVerificationId: string;
    result: string;
    verificationDueDate: Date;
    dueReminderSentAt: Date | null;
}
export declare function findCapaEffectivenessVerificationDue(candidates: CapaEffectivenessVerificationDueCandidate[], now: Date): CapaEffectivenessVerificationDueCandidate[];
