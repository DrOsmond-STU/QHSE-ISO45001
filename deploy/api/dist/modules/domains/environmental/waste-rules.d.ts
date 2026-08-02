import { EnvManifestStatus, EnvWasteType } from "@prisma/client";
export declare function assertWasteCodeRequiredForHazardous(wasteType: EnvWasteType, wasteCode: string | null): void;
export declare function isStorageDurationWarningDue(storageStartDate: Date, maxStorageDurationDays: number, now: Date): boolean;
export declare function isStorageDurationExceeded(storageStartDate: Date, maxStorageDurationDays: number, now: Date): boolean;
export declare function validateManifestStatusTransition(from: EnvManifestStatus, to: EnvManifestStatus): void;
