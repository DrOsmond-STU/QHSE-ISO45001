export interface AuditFindingClosureDueCandidate {
    auditFindingId: string;
    status: string;
    targetClosureDate: Date | null;
}
export declare function findFindingsClosureDue(candidates: AuditFindingClosureDueCandidate[], now: Date): AuditFindingClosureDueCandidate[];
