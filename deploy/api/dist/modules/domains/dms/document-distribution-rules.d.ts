import { DistributionTargetType, DocumentClassification, DocumentStatus } from "@prisma/client";
export declare function assertDocumentAcceptsNewDistribution(status: DocumentStatus): void;
export declare function assertClassificationAllowsTarget(classification: DocumentClassification, targetType: DistributionTargetType): void;
