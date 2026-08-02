import { AcknowledgementMethod, ReadAcknowledgementStatus } from "@prisma/client";
export declare function validateAcknowledgementTransition(from: ReadAcknowledgementStatus, to: ReadAcknowledgementStatus, method: AcknowledgementMethod | null): void;
