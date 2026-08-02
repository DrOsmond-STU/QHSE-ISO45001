import { CalibrationSchedule, CalibrationScheduleStatus, NumberingConfig } from "@prisma/client";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
export interface CreateCalibrationScheduleInput {
    calibrationItemId: string;
    scheduledDate?: Date;
    dueDate: Date;
    assignedProviderId?: string;
    notes?: string;
}
export interface UpdateCalibrationScheduleInput {
    scheduledDate?: Date;
    dueDate?: Date;
    assignedProviderId?: string;
    status?: CalibrationScheduleStatus;
    notes?: string;
}
export declare class CalibrationScheduleService {
    private readonly prisma;
    private readonly numbering;
    constructor(prisma: PrismaService, numbering: NumberingService);
    ensureNumberingConfig(siteId: string): Promise<NumberingConfig>;
    create(input: CreateCalibrationScheduleInput): Promise<CalibrationSchedule>;
    update(id: string, input: UpdateCalibrationScheduleInput): Promise<CalibrationSchedule>;
    getById(id: string): Promise<CalibrationSchedule>;
    listByItem(calibrationItemId: string): Promise<CalibrationSchedule[]>;
}
