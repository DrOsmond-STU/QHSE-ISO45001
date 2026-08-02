export interface CapaRootCauseSlaCandidate {
    capaRegisterId: string;
    status: string;
    initiatedAt: Date;
    rootCauseSlaReminderSentAt: Date | null;
}
export declare function findCapaRootCauseSlaDue(candidates: CapaRootCauseSlaCandidate[], now: Date): CapaRootCauseSlaCandidate[];
