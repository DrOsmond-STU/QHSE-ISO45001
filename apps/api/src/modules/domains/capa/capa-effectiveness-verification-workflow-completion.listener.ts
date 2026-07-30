import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { tenantContextStorage } from "../../../platform/tenancy/tenant-context";
import { WORKFLOW_INSTANCE_COMPLETED_EVENT } from "../../../platform/workflow-engine/workflow-engine.constants";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { AuditFindingService } from "../audit/audit-finding.service";
import { IncidentCorrectiveActionLinkService } from "../incident/incident-corrective-action-link.service";
import { resolveEffectivenessOutcome } from "./capa-register-lifecycle";
import { CapaRegisterService } from "./capa-register.service";

// Lihat banner comment CapaEffectivenessVerificationService soal
// entityId=capa_effectiveness_verification.id (BEDA dari capa_action_plan).
const CAPA_EFFECTIVENESS_VERIFICATION_WORKFLOW_ENTITY_TYPE = "capa_effectiveness_verification";

/**
 * Task 4.2 — konsumen WORKFLOW_INSTANCE_COMPLETED_EVENT utk entity_type=
 * capa_effectiveness_verification. `payload.entityId` = baris
 * capa_effectiveness_verification (BUKAN capa_register.id) — listener
 * BOLEH re-query baris ITU (bukan baris yang SEDANG ditulis emitting
 * transaction — `result`/`capaRegisterId` SUDAH commit jauh sebelumnya
 * di `recordResult()`, panggilan TERPISAH dari `submitForApproval()`
 * yang men-start instance ini, BUKAN race pre-commit yang didokumentasikan
 * WorkflowInstanceCompletedEvent banner comment — lihat gap TDD §26
 * terkait). APPROVED -> baca `result` -> `resolveEffectivenessOutcome()`
 * (BR-01/BR-04) -> `CapaRegisterService.markEffectivenessVerificationApproved()`.
 * REJECTED -> `returnToInProgress()` (HSE Manager tidak terima temuan
 * verifikasi, PIC/Verifier redo).
 *
 * PRD §4 poin 10 — "Notifikasi status closure dikirim ke modul sumber
 * sehingga entitas sumber (mis. audit_findings.status, incident_corrective_
 * actions.capa_status_cache) ikut ter-update." Diwujudkan LANGSUNG di sini
 * (bukan notifikasi terpisah) begitu outcome=EFFECTIVE_CLOSED, KHUSUS 2
 * source_type yang PRD SENDIRI beri contoh eksplisit: AUDIT_FINDING
 * (`AuditFindingService.verify()`+`close()`, CAPA_LINKED->VERIFIED->CLOSED)
 * & INCIDENT (`IncidentCorrectiveActionLinkService.updateCapaStatusCache()`,
 * SEMUA baris incident_corrective_actions yang menunjuk capa_register ini).
 * INSPECTION_FINDING TIDAK disinkron otomatis — PRD Modul 08 §7 sendiri
 * sebut tautan itu "opsional/manual". CATATAN: hanya CREATION CAPA
 * AUDIT_FINDING yang genuinely "otomatis" (Modul 09 §4 poin 6, event
 * audit.finding_capa_required); CREATION CAPA INCIDENT tetap human-triggered
 * ("investigator memicu", Modul 07 §4 poin 6 — TIDAK ada listener setara
 * AuditFindingCapaTriggerListener utk Incident, gap TDD §26 kalau PRD
 * ternyata dimaksudkan otomatis juga). Sync-back CLOSURE (blok ini) beda
 * concern — CAPA §4 poin 10 SENDIRI eksplisit menamai KEDUA
 * audit_findings.status & incident_corrective_actions.capa_status_cache
 * sbg target, TERLEPAS dari bagaimana CAPA-nya tadi dibuat. `verification.verifiedBy` dipakai sbg
 * aktor konteks utk KESELURUHAN cascade ini (WorkflowInstanceCompletedEvent
 * tanpa field actor, `verifiedBy` adalah aktor paling relevan yang genuinely
 * tersedia).
 *
 * PRD §8 baris 6/7 ("Hasil verifikasi NOT_EFFECTIVE" / "CAPA closed") —
 * DUA SATU-SATUNYA event notifikasi PRD §8 yang genuinely py call site
 * SIAP PAKAI di sini (outcome sudah dihitung, capa_register sudah
 * di-update) — dienqueue LANGSUNG, bukan lewat scan job terpisah (beda
 * dari baris 2/5 yang genuinely butuh polling periodik krn tidak ada
 * trigger event). Baris 7 "modul sumber terkait" diwujudkan via
 * syncClosureToSourceModule() di atas (state, bukan notifikasi user) —
 * penerima notifikasi HANYA Initiator (tidak ada user/role lain yang PRD
 * sebut utk baris ini).
 */
@Injectable()
export class CapaEffectivenessVerificationWorkflowCompletionListener {
  private readonly logger = new Logger(CapaEffectivenessVerificationWorkflowCompletionListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registerService: CapaRegisterService,
    private readonly auditFindingService: AuditFindingService,
    private readonly incidentCorrectiveActionLinkService: IncidentCorrectiveActionLinkService,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(WORKFLOW_INSTANCE_COMPLETED_EVENT)
  async onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void> {
    if (payload.entityType !== CAPA_EFFECTIVENESS_VERIFICATION_WORKFLOW_ENTITY_TYPE) return;

    try {
      const verification = await tenantContextStorage.run({ tenantId: payload.tenantId }, () =>
        this.prisma.withRls((tx) => tx.capaEffectivenessVerification.findUniqueOrThrow({ where: { id: payload.entityId } })),
      );

      await tenantContextStorage.run({ tenantId: payload.tenantId, userId: verification.verifiedBy }, async () => {
        if (payload.status === "APPROVED") {
          const outcome = resolveEffectivenessOutcome(verification.result);
          await this.registerService.markEffectivenessVerificationApproved(verification.capaRegisterId, outcome);
          if (outcome === "EFFECTIVE_CLOSED") {
            await this.syncClosureToSourceModule(verification.capaRegisterId);
            await this.notifyEffectiveClosed(payload.tenantId, verification.capaRegisterId);
          } else if (outcome === "NOT_EFFECTIVE_REOPENED") {
            await this.notifyNotEffectiveReopened(payload.tenantId, verification.capaRegisterId);
          }
        } else if (payload.status === "REJECTED") {
          await this.registerService.returnToInProgress(verification.capaRegisterId);
        }
      });
    } catch (err) {
      this.logger.error(
        `Gagal memproses WORKFLOW_INSTANCE_COMPLETED_EVENT utk capa_effectiveness_verification=${payload.entityId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private async syncClosureToSourceModule(capaRegisterId: string): Promise<void> {
    const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
    if (!capa.sourceId) return;

    if (capa.sourceType === "AUDIT_FINDING") {
      await this.auditFindingService.verify(capa.sourceId);
      await this.auditFindingService.close(capa.sourceId);
    } else if (capa.sourceType === "INCIDENT") {
      const links = await this.prisma.withRls((tx) => tx.incidentCorrectiveAction.findMany({ where: { capaRegisterId } }));
      for (const link of links) {
        await this.incidentCorrectiveActionLinkService.updateCapaStatusCache(link.id, "EFFECTIVE_CLOSED");
      }
    }
  }

  private async notifyEffectiveClosed(tenantId: string, capaRegisterId: string): Promise<void> {
    const capa = await this.prisma.withRls((tx) => tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId } }));
    await tenantContextStorage.run({ tenantId }, () =>
      this.notificationService.enqueue({
        eventType: "CAPA_EFFECTIVE_CLOSED",
        entityType: "CAPA_REGISTER",
        entityId: capaRegisterId,
        recipientUserId: capa.initiatedBy,
        priority: "MEDIUM",
        eventCategory: "CAPA",
        variables: { capaNumber: capa.capaNumber },
      }),
    );
  }

  private async notifyNotEffectiveReopened(tenantId: string, capaRegisterId: string): Promise<void> {
    const capa = await this.prisma.withRls((tx) =>
      tx.capaRegister.findUniqueOrThrow({ where: { id: capaRegisterId }, include: { actionPlans: true } }),
    );
    const hseManagers = await this.prisma.withRls((tx) =>
      tx.user.findMany({ where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } }, select: { id: true } }),
    );
    const recipientUserIds = new Set([capa.initiatedBy, ...hseManagers.map((m) => m.id), ...capa.actionPlans.map((p) => p.picUserId)]);

    await tenantContextStorage.run({ tenantId }, async () => {
      for (const recipientUserId of recipientUserIds) {
        await this.notificationService.enqueue({
          eventType: "CAPA_NOT_EFFECTIVE_REOPENED",
          entityType: "CAPA_REGISTER",
          entityId: capaRegisterId,
          recipientUserId,
          priority: "HIGH",
          eventCategory: "CAPA",
          variables: { capaNumber: capa.capaNumber },
        });
      }
    });
  }
}
