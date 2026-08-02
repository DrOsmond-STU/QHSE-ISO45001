import { EmergencyDrillStatus, EmergencyDrillType } from "@prisma/client";
export declare function validateEmergencyDrillStatusTransition(from: EmergencyDrillStatus, to: EmergencyDrillStatus): void;
export declare function assertActivationExistsIfFullScaleEvacuation(drillType: EmergencyDrillType, activationCount: number): void;
export declare function assertCapaLinkedIfGapsIdentified(gapsIdentified: string | null | undefined, capaId: string | null | undefined): void;
