import { HiradcRecordStatus } from "@prisma/client";
export declare function validateHiradcRecordStatusTransition(from: HiradcRecordStatus, to: HiradcRecordStatus): void;
export interface HiradcBaselineCandidate {
    relatedHiraId: string | null;
    relatedJsaId: string | null;
    lineCount: number;
}
export declare function assertHasBaselineOrStandaloneLines(candidate: HiradcBaselineCandidate): void;
