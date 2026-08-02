import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { NotificationService } from "../../../platform/notification/notification.service";
import { WorkflowInstanceCompletedEvent } from "../../../platform/workflow-engine/workflow-engine-events";
import { AuditFindingService } from "../audit/audit-finding.service";
import { IncidentCorrectiveActionLinkService } from "../incident/incident-corrective-action-link.service";
import { CapaRegisterService } from "./capa-register.service";
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
export declare class CapaEffectivenessVerificationWorkflowCompletionListener {
    private readonly prisma;
    private readonly registerService;
    private readonly auditFindingService;
    private readonly incidentCorrectiveActionLinkService;
    private readonly notificationService;
    private readonly logger;
    constructor(prisma: PrismaService, registerService: CapaRegisterService, auditFindingService: AuditFindingService, incidentCorrectiveActionLinkService: IncidentCorrectiveActionLinkService, notificationService: NotificationService);
    onWorkflowInstanceCompleted(payload: WorkflowInstanceCompletedEvent): Promise<void>;
    private syncClosureToSourceModule;
    private notifyEffectiveClosed;
    private notifyNotEffectiveReopened;
}
