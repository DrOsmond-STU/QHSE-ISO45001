import { CapaRegisterStatus, CapaVerificationResult } from "@prisma/client";
export declare function validateCapaRegisterStatusTransition(from: CapaRegisterStatus, to: CapaRegisterStatus): void;
export declare function resolveEffectivenessOutcome(result: CapaVerificationResult): CapaRegisterStatus;
