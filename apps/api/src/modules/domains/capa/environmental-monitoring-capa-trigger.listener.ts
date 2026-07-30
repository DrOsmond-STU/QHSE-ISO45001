import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { EnvironmentalMonitoringRecordService, ENV_MONITORING_CAPA_REQUIRED_EVENT, EnvMonitoringCapaRequiredEvent } from "../environmental/environmental-monitoring-record.service";
import { CapaRegisterService } from "./capa-register.service";

/**
 * Task 5.2 — konsumen SUNGGUHAN PERTAMA `environmental.monitoring_capa_required`
 * (event stub, TIDAK ada listener sebelum task ini krn Environmental baru
 * dibangun task ini juga — beda dari `audit.finding_capa_required` 4.1
 * yang sempat jadi stub TANPA konsumen selama satu task penuh sebelum
 * CAPA 4.2 ada). PRD Modul 12 §6 BR-02 "compliance_status=EXCEED otomatis
 * membuat draft CAPA" — listener ini yang mewujudkan kata "otomatis" itu:
 * buat `capa_register` (source_type=ENVIRONMENTAL_MONITORING) LALU
 * `EnvironmentalMonitoringRecordService.linkCapaRegister()` menulis balik
 * FK-nya. `userId` context diambil dari `payload.identifiedBy`, pola
 * PERSIS `AuditFindingCapaTriggerListener` 4.2.
 *
 * CapaModule mengimpor EnvironmentalModule (arah domain->domain diizinkan
 * utk orkestrasi, KETIGA kalinya CapaModule jadi hub setelah Audit+Incident
 * 4.2) — modul SUMBER (Environmental) TIDAK mengimpor CapaModule sama
 * sekali, arah ketergantungan SEARAH.
 */
@Injectable()
export class EnvironmentalMonitoringCapaTriggerListener {
  private readonly logger = new Logger(EnvironmentalMonitoringCapaTriggerListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly capaRegisterService: CapaRegisterService,
    private readonly monitoringRecordService: EnvironmentalMonitoringRecordService,
  ) {}

  @OnEvent(ENV_MONITORING_CAPA_REQUIRED_EVENT)
  async onEnvironmentalMonitoringCapaRequired(payload: EnvMonitoringCapaRequiredEvent): Promise<void> {
    await tenantContextStorage.run({ tenantId: payload.tenantId, userId: payload.identifiedBy }, async () => {
      try {
        const record = await this.prisma.withRls((tx) =>
          tx.environmentalMonitoringRecord.findUniqueOrThrow({ where: { id: payload.monitoringRecordId }, select: { capaRegisterId: true, siteId: true } }),
        );
        if (record.capaRegisterId) return; // idempotent — sudah pernah ditautkan.

        const capa = await this.capaRegisterService.create({
          sourceType: "ENVIRONMENTAL_MONITORING",
          sourceId: payload.monitoringRecordId,
          sourceReferenceNumber: payload.monitoringNumber,
          category: "CORRECTIVE",
          priority: "HIGH",
          title: `Parameter ${payload.parameterName} melebihi baku mutu — ${payload.monitoringNumber}`,
          problemStatement: `environmental_monitoring_records ${payload.monitoringNumber}: parameter "${payload.parameterName}" hasil ${payload.resultValue} EXCEED baku mutu (BR-02).`,
          siteId: payload.siteId,
        });

        await this.monitoringRecordService.linkCapaRegister(payload.monitoringRecordId, capa.id);
      } catch (err) {
        this.logger.error(
          `Gagal memproses ${ENV_MONITORING_CAPA_REQUIRED_EVENT} utk monitoring_record=${payload.monitoringRecordId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
