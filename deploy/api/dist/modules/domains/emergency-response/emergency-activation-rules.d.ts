import { EmergencyActivationStatus } from "@prisma/client";
export declare function validateEmergencyActivationStatusTransition(from: EmergencyActivationStatus, to: EmergencyActivationStatus): void;
export declare function computeMissingPersonCount(totalExpectedHeadcount: number | null, totalCheckedInCount: number): number | null;
