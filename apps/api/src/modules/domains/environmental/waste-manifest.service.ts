import { Injectable } from "@nestjs/common";
import { EnvWastePackagingType, EnvWasteType, EnvWasteUnitOfMeasure, WasteManifestRecord } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NumberingService } from "../../../platform/numbering/numbering.service";
import { requireActorUserId, requireTenantId } from "./environmental-context";
import { assertWasteCodeRequiredForHazardous, validateManifestStatusTransition } from "./waste-rules";
import { EnvironmentalWorkflowBootstrapService } from "./environmental-workflow-bootstrap.service";
import { WasteGenerationLogService } from "./waste-generation-log.service";

const MANIFEST_NUMBERING_MODULE_CODE = "WASTE_MANIFEST";

export interface CreateWasteManifestInput {
  siteId: string;
  wasteType: EnvWasteType;
  wasteCode?: string;
  wasteName: string;
  wasteDescription?: string;
  wasteSourceProcess?: string;
  quantity: number;
  unitOfMeasure: EnvWasteUnitOfMeasure;
  packagingType: EnvWastePackagingType;
  generationDate: Date;
  storageLocation?: string;
  tpsLb3PermitId?: string;
  linkedGenerationLogIds?: string[];
}

/**
 * Task 5.2 (Modul 12 §4.3, §3 "Environmental Officer | environmental.waste_manifest.manage",
 * "TPS LB3 Officer | environmental.waste_manifest.create"). BELUM ada
 * controller HTTP.
 */
@Injectable()
export class WasteManifestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberingService: NumberingService,
    private readonly bootstrapService: EnvironmentalWorkflowBootstrapService,
    private readonly wasteGenerationLogService: WasteGenerationLogService,
  ) {}

  async create(input: CreateWasteManifestInput): Promise<WasteManifestRecord> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    assertWasteCodeRequiredForHazardous(input.wasteType, input.wasteCode ?? null);

    await this.bootstrapService.ensureManifestNumberingConfig(input.siteId);
    const site = await this.prisma.withRls((tx) => tx.site.findUniqueOrThrow({ where: { id: input.siteId }, select: { siteCode: true } }));
    const manifestNumber = await this.numberingService.generateNext(MANIFEST_NUMBERING_MODULE_CODE, {
      scopeId: input.siteId,
      variables: { SITE_CODE: site.siteCode },
    });

    const manifest = await this.prisma.withRls((tx) =>
      tx.wasteManifestRecord.create({
        data: {
          tenantId,
          siteId: input.siteId,
          manifestNumber,
          wasteType: input.wasteType,
          wasteCode: input.wasteCode,
          wasteName: input.wasteName,
          wasteDescription: input.wasteDescription,
          wasteSourceProcess: input.wasteSourceProcess,
          quantity: input.quantity,
          unitOfMeasure: input.unitOfMeasure,
          packagingType: input.packagingType,
          generationDate: input.generationDate,
          storageLocation: input.storageLocation,
          tpsLb3PermitId: input.tpsLb3PermitId,
          manifestStatus: "DRAFT",
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );

    for (const logId of input.linkedGenerationLogIds ?? []) {
      await this.wasteGenerationLogService.linkToManifest(logId, manifest.id);
    }

    return manifest;
  }

  async issue(manifestId: string): Promise<WasteManifestRecord> {
    return this.transition(manifestId, "ISSUED");
  }

  async markInTransit(
    manifestId: string,
    detail: { transporterName: string; transporterLicenseNo: string; transporterVehicleNo: string; transportDate: Date },
  ): Promise<WasteManifestRecord> {
    const updatedBy = requireActorUserId();
    const manifest = await this.prisma.withRls((tx) => tx.wasteManifestRecord.findUniqueOrThrow({ where: { id: manifestId } }));
    validateManifestStatusTransition(manifest.manifestStatus, "IN_TRANSIT");
    return this.prisma.withRls((tx) =>
      tx.wasteManifestRecord.update({
        where: { id: manifestId },
        data: { manifestStatus: "IN_TRANSIT", updatedBy, ...detail },
      }),
    );
  }

  async markReceivedByTransporter(manifestId: string): Promise<WasteManifestRecord> {
    return this.transition(manifestId, "RECEIVED_BY_TRANSPORTER");
  }

  async markReceivedByProcessor(
    manifestId: string,
    detail: { destinationFacilityName: string; destinationFacilityLicenseNo: string; receivingConfirmationDate: Date },
  ): Promise<WasteManifestRecord> {
    const updatedBy = requireActorUserId();
    const manifest = await this.prisma.withRls((tx) => tx.wasteManifestRecord.findUniqueOrThrow({ where: { id: manifestId } }));
    validateManifestStatusTransition(manifest.manifestStatus, "RECEIVED_BY_PROCESSOR");
    return this.prisma.withRls((tx) =>
      tx.wasteManifestRecord.update({
        where: { id: manifestId },
        data: { manifestStatus: "RECEIVED_BY_PROCESSOR", updatedBy, ...detail },
      }),
    );
  }

  async complete(manifestId: string): Promise<WasteManifestRecord> {
    return this.transition(manifestId, "COMPLETED");
  }

  async reject(manifestId: string): Promise<WasteManifestRecord> {
    return this.transition(manifestId, "REJECTED");
  }

  /** BR-04 — festronik_manifest_no identitas TERPISAH, bukan hasil numbering_configs. */
  async recordFestronikNumber(manifestId: string, festronikManifestNo: string): Promise<WasteManifestRecord> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.wasteManifestRecord.update({ where: { id: manifestId }, data: { festronikManifestNo, festronikSyncStatus: "SYNCED", updatedBy } }),
    );
  }

  private async transition(manifestId: string, to: WasteManifestRecord["manifestStatus"]): Promise<WasteManifestRecord> {
    const updatedBy = requireActorUserId();
    const manifest = await this.prisma.withRls((tx) => tx.wasteManifestRecord.findUniqueOrThrow({ where: { id: manifestId } }));
    validateManifestStatusTransition(manifest.manifestStatus, to);
    return this.prisma.withRls((tx) => tx.wasteManifestRecord.update({ where: { id: manifestId }, data: { manifestStatus: to, updatedBy } }));
  }

  async getById(manifestId: string): Promise<WasteManifestRecord> {
    return this.prisma.withRls((tx) => tx.wasteManifestRecord.findUniqueOrThrow({ where: { id: manifestId } }));
  }

  async listBySite(siteId: string): Promise<WasteManifestRecord[]> {
    return this.prisma.withRls((tx) => tx.wasteManifestRecord.findMany({ where: { siteId }, orderBy: { createdAt: "desc" } }));
  }
}
