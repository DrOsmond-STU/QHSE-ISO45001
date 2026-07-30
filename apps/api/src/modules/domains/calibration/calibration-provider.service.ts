import { Injectable } from "@nestjs/common";
import { CalibrationProvider, CalibrationProviderType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./calibration-context";

export interface CreateCalibrationProviderInput {
  providerName: string;
  providerType: CalibrationProviderType;
  accreditationBody?: string;
  accreditationNumber?: string;
  accreditationScope?: unknown;
  accreditationValidUntil?: Date;
  address?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
}

export type UpdateCalibrationProviderInput = Partial<CreateCalibrationProviderInput> & { isActive?: boolean };

@Injectable()
export class CalibrationProviderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCalibrationProviderInput): Promise<CalibrationProvider> {
    const tenantId = requireTenantId();
    const actorUserId = requireActorUserId();

    return this.prisma.withRls((tx) =>
      tx.calibrationProvider.create({
        data: {
          tenantId,
          providerName: input.providerName,
          providerType: input.providerType,
          accreditationBody: input.accreditationBody,
          accreditationNumber: input.accreditationNumber,
          accreditationScope: input.accreditationScope ?? undefined,
          accreditationValidUntil: input.accreditationValidUntil,
          address: input.address,
          contactPersonName: input.contactPersonName,
          contactPersonPhone: input.contactPersonPhone,
          contactPersonEmail: input.contactPersonEmail,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async update(id: string, input: UpdateCalibrationProviderInput): Promise<CalibrationProvider> {
    const actorUserId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.calibrationProvider.update({
        where: { id },
        data: {
          providerName: input.providerName,
          providerType: input.providerType,
          accreditationBody: input.accreditationBody,
          accreditationNumber: input.accreditationNumber,
          accreditationScope: input.accreditationScope ?? undefined,
          accreditationValidUntil: input.accreditationValidUntil,
          address: input.address,
          contactPersonName: input.contactPersonName,
          contactPersonPhone: input.contactPersonPhone,
          contactPersonEmail: input.contactPersonEmail,
          isActive: input.isActive,
          updatedBy: actorUserId,
        },
      }),
    );
  }

  async getById(id: string): Promise<CalibrationProvider> {
    return this.prisma.withRls((tx) => tx.calibrationProvider.findUniqueOrThrow({ where: { id } }));
  }

  async list(): Promise<CalibrationProvider[]> {
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) => tx.calibrationProvider.findMany({ where: { tenantId, deletedAt: null }, orderBy: { providerName: "asc" } }));
  }
}
