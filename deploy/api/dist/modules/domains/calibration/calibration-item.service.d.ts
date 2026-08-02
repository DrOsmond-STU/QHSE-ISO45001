import { CalibrationItem, CalibrationItemStatus } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateCalibrationItemInput {
    assetId: string;
    departmentId?: string;
    measurementParameter: string;
    measurementRangeMin?: number;
    measurementRangeMax?: number;
    measurementRangeUnit?: string;
    accuracyClass?: string;
    resolution?: string;
    calibrationIntervalMonths: number;
    calibrationMethodStandard?: string;
    isCriticalMeasurement?: boolean;
}
export interface UpdateCalibrationItemInput {
    departmentId?: string;
    measurementParameter?: string;
    measurementRangeMin?: number;
    measurementRangeMax?: number;
    measurementRangeUnit?: string;
    accuracyClass?: string;
    resolution?: string;
    calibrationIntervalMonths?: number;
    calibrationMethodStandard?: string;
    isCriticalMeasurement?: boolean;
    calibrationStatus?: CalibrationItemStatus;
}
export declare class CalibrationItemService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateCalibrationItemInput): Promise<CalibrationItem>;
    update(id: string, input: UpdateCalibrationItemInput): Promise<CalibrationItem>;
    getById(id: string): Promise<CalibrationItem>;
    list(): Promise<CalibrationItem[]>;
    syncSiteId(assetId: string, newSiteId: string): Promise<void>;
}
