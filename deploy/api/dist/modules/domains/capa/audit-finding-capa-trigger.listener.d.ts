import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { AuditFindingCapaRequiredEvent, AuditFindingService } from "../audit/audit-finding.service";
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
export declare class AuditFindingCapaTriggerListener {
    private readonly prisma;
    private readonly capaRegisterService;
    private readonly auditFindingService;
    private readonly logger;
    constructor(prisma: PrismaService, capaRegisterService: CapaRegisterService, auditFindingService: AuditFindingService);
    onAuditFindingCapaRequired(payload: AuditFindingCapaRequiredEvent): Promise<void>;
}
