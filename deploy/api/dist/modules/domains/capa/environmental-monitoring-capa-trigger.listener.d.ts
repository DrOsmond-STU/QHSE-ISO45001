import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { EnvironmentalMonitoringRecordService, EnvMonitoringCapaRequiredEvent } from "../environmental/environmental-monitoring-record.service";
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
export declare class EnvironmentalMonitoringCapaTriggerListener {
    private readonly prisma;
    private readonly capaRegisterService;
    private readonly monitoringRecordService;
    private readonly logger;
    constructor(prisma: PrismaService, capaRegisterService: CapaRegisterService, monitoringRecordService: EnvironmentalMonitoringRecordService);
    onEnvironmentalMonitoringCapaRequired(payload: EnvMonitoringCapaRequiredEvent): Promise<void>;
}
