import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { AUDIT_FINDING_CAPA_REQUIRED_EVENT, AuditFindingCapaRequiredEvent, AuditFindingService } from "../audit/audit-finding.service";
import { CapaRegisterService } from "./capa-register.service";

/**
 * Task 4.2 — konsumen SUNGGUHAN PERTAMA `audit.finding_capa_required`
 * (event stub sejak task 4.1, sebelumnya TANPA listener sama sekali).
 * PRD Modul 09 §4 poin 1 "CAPA dibuat OTOMATIS saat audit_findings Major/
 * Minor NC dibuat" — listener ini yang mewujudkan kata "otomatis" itu:
 * buat `capa_register` (source_type=AUDIT_FINDING) LALU
 * `AuditFindingService.linkCapaRegister()` menulis balik FK-nya. `userId`
 * context diambil dari `payload.identifiedBy` (aktor asli yang mencatat
 * temuan) — listener event TIDAK py AsyncLocalStorage aktor request HTTP
 * manapun (event fire-and-forget, bukan panggilan sinkron dalam request
 * yang sama), pola sama seluruh `WorkflowInstanceCompletedEvent` listener
 * lain yang selalu re-establish tenant context dari payload.
 *
 * CapaModule mengimpor AuditModule (arah domain->domain diizinkan utk
 * orkestrasi, pola sama `ProvisioningService` 1.5 impor Organization+UserRole)
 * — modul SUMBER (Audit) TIDAK mengimpor CapaModule sama sekali, arah
 * ketergantungan SEARAH (hub CAPA yang tahu soal modul sumber, bukan
 * sebaliknya).
 */
@Injectable()
export class AuditFindingCapaTriggerListener {
  private readonly logger = new Logger(AuditFindingCapaTriggerListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly capaRegisterService: CapaRegisterService,
    private readonly auditFindingService: AuditFindingService,
  ) {}

  @OnEvent(AUDIT_FINDING_CAPA_REQUIRED_EVENT)
  async onAuditFindingCapaRequired(payload: AuditFindingCapaRequiredEvent): Promise<void> {
    await tenantContextStorage.run({ tenantId: payload.tenantId, userId: payload.identifiedBy }, async () => {
      try {
        const finding = await this.prisma.withRls((tx) =>
          tx.auditFinding.findUniqueOrThrow({ where: { id: payload.auditFindingId }, include: { audit: true } }),
        );
        if (finding.capaRegisterId) return; // idempotent — sudah pernah ditautkan.

        const capa = await this.capaRegisterService.create({
          sourceType: "AUDIT_FINDING",
          sourceId: payload.auditFindingId,
          sourceReferenceNumber: finding.audit.auditNumber,
          category: "CORRECTIVE",
          priority: payload.classification === "MAJOR_NC" ? "HIGH" : "MEDIUM",
          title: `Temuan Audit ${finding.findingNumber} (${payload.classification}) — ${finding.audit.auditNumber}`,
          problemStatement: payload.description,
          siteId: finding.audit.siteId,
          targetClosureDate: finding.targetClosureDate ?? undefined,
        });

        await this.auditFindingService.linkCapaRegister(payload.auditFindingId, capa.id);
      } catch (err) {
        this.logger.error(
          `Gagal memproses ${AUDIT_FINDING_CAPA_REQUIRED_EVENT} utk audit_finding=${payload.auditFindingId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  }
}
