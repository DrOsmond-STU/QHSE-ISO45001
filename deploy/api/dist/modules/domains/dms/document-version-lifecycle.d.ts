import { DocumentVersionStatus } from "@prisma/client";
export declare function validateDocumentVersionStatusTransition(from: DocumentVersionStatus, to: DocumentVersionStatus): void;
export declare function assertCanBeCurrentVersion(status: DocumentVersionStatus): void;
export type VersionBump = "MAJOR" | "MINOR";
export interface VersionNumber {
    majorVersion: number;
    minorVersion: number;
}
export declare function computeNextVersionNumber(previous: VersionNumber | null, bump: VersionBump): VersionNumber;
