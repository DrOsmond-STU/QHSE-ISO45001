import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AuditFinding, AuditFindingClassification } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./audit-context";
import { computeTargetClosureDate } from "./audit-lifecycle";
import { resolveDefaultRequiresCapa, validateAuditFindingStatusTransition } from "./audit-finding-rules";

export const AUDIT_FINDING_CAPA_REQUIRED_EVENT = "audit.finding_capa_required";

export interface CreateAuditFindingInput {
  auditId: string;
  checklistItemId?: string;
  findingNumber: string;
  classification: AuditFindingClassification;
  clauseReference?: string;
  description: string;
  evidenceDescription?: string;
  requiresCapa?: boolean;
}

export interface AuditFindingCapaRequiredEvent {
  tenantId: string;
  auditFindingId: string;
  auditId: string;
  classification: AuditFindingClassification;
  description: string;
  identifiedBy: string;
  identifiedAt: Date;
}

/**
 * Task 4.1 (Modul 09 §4 poin 6/§6 BR-02/04/05, §7). PRD §7 "audit_findings
 * Major/Minor NC memicu CAPA (source_type=AUDIT_FINDING)" — Modul 10 (CAPA,
 * task 4.2) BELUM ADA, jadi create() HANYA emit event via EventEmitter2
 * (pola PERSIS InspectionFindingService.INSPECTION_FINDING_CREATED_EVENT
 * 3.6, namespace `audit.` bukan lewat WorkflowEngineService) BILA
 * requiresCapa=true (default TRUE utk Major/Minor NC, BISA override manual
 * jadi true utk Observation/OFI juga — event tetap dipicu kalau override
 * begitu, konsisten literal "memicu CAPA" merujuk ke requires_capa BUKAN
 * classification mentah). TIDAK ADA listener yang genuinely mengonsumsi
 * event ini sekarang di codebase ini — linkCapaRegister() jadi titik
 * sinkronisasi MANUAL begitu Modul 10 genuinely ada, gap TDD §26.
 */
@Injectable()
export class AuditFindingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(input: CreateAuditFindingInput): Promise<AuditFinding> {
    const identifiedBy = requireActorUserId();
    const tenantId = requireTenantId();
    const identifiedAt = new Date();
    const requiresCapa = input.requiresCapa ?? resolveDefaultRequiresCapa(input.classification);
    const targetClosureDate = computeTargetClosureDate(identifiedAt, input.classification);

    const finding = await this.prisma.withRls((tx) =>
      tx.auditFinding.create({
        data: {
          tenantId,
          auditId: input.auditId,
          checklistItemId: input.checklistItemId,
          findingNumber: input.findingNumber,
          classification: input.classification,
          clauseReference: input.clauseReference,
          description: input.description,
          evidenceDescription: input.evidenceDescription,
          requiresCapa,
          status: "OPEN",
          identifiedBy,
          identifiedAt,
          targetClosureDate,
          createdBy: identifiedBy,
          updatedBy: identifiedBy,
        },
      }),
    );

    if (requiresCapa) {
      const event: AuditFindingCapaRequiredEvent = {
        tenantId,
        auditFindingId: finding.id,
        auditId: finding.auditId,
        classification: finding.classification,
        description: finding.description,
        identifiedBy: finding.identifiedBy,
        identifiedAt: finding.identifiedAt,
      };
      this.eventEmitter.emit(AUDIT_FINDING_CAPA_REQUIRED_EVENT, event);
    }

    return finding;
  }

  /**
   * BR-05 — "Perubahan classification wajib dicatat di system_audit_logs
   * (OTOMATIS via audit_log_trigger generik, TIDAK ADA kode tambahan di
   * sini) dan memicu perhitungan ulang target_closure_date."
   */
  async updateClassification(auditFindingId: string, classification: AuditFindingClassification): Promise<AuditFinding> {
    const updatedBy = requireActorUserId();
    const finding = await this.prisma.withRls((tx) => tx.auditFinding.findUniqueOrThrow({ where: { id: auditFindingId } }));
    const targetClosureDate = computeTargetClosureDate(finding.identifiedAt, classification);
    return this.prisma.withRls((tx) =>
      tx.auditFinding.update({ where: { id: auditFindingId }, data: { classification, targetClosureDate, updatedBy } }),
    );
  }

  // PRD §3 "Auditee (Department Head) | ... memberi auditee_response".
  async setAuditeeResponse(auditFindingId: string, auditeeResponse: string): Promise<AuditFinding> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.auditFinding.update({ where: { id: auditFindingId }, data: { auditeeResponse, updatedBy } }),
    );
  }

  /** Titik sinkronisasi MANUAL begitu Modul 10 genuinely ada dan CAPA
   * dibuat DI SANA — TIDAK ADA listener otomatis, pola sama
   * InspectionFindingService.linkActionTracking() 3.6. */
  async linkCapaRegister(auditFindingId: string, capaRegisterId: string): Promise<AuditFinding> {
    const updatedBy = requireActorUserId();
    const finding = await this.prisma.withRls((tx) => tx.auditFinding.findUniqueOrThrow({ where: { id: auditFindingId } }));
    validateAuditFindingStatusTransition(finding.status, "CAPA_LINKED", finding.requiresCapa);
    return this.prisma.withRls((tx) =>
      tx.auditFinding.update({ where: { id: auditFindingId }, data: { capaRegisterId, status: "CAPA_LINKED", updatedBy } }),
    );
  }

  // "CAPA terkait sudah effectiveness verified Modul 10" — sinkronisasi MANUAL.
  async verify(auditFindingId: string): Promise<AuditFinding> {
    const updatedBy = requireActorUserId();
    const finding = await this.prisma.withRls((tx) => tx.auditFinding.findUniqueOrThrow({ where: { id: auditFindingId } }));
    validateAuditFindingStatusTransition(finding.status, "VERIFIED", finding.requiresCapa);
    return this.prisma.withRls((tx) => tx.auditFinding.update({ where: { id: auditFindingId }, data: { status: "VERIFIED", updatedBy } }));
  }

  async close(auditFindingId: string): Promise<AuditFinding> {
    const updatedBy = requireActorUserId();
    const finding = await this.prisma.withRls((tx) => tx.auditFinding.findUniqueOrThrow({ where: { id: auditFindingId } }));
    validateAuditFindingStatusTransition(finding.status, "CLOSED", finding.requiresCapa);
    return this.prisma.withRls((tx) =>
      tx.auditFinding.update({ where: { id: auditFindingId }, data: { status: "CLOSED", closedAt: new Date(), updatedBy } }),
    );
  }

  async getById(auditFindingId: string): Promise<AuditFinding> {
    return this.prisma.withRls((tx) => tx.auditFinding.findUniqueOrThrow({ where: { id: auditFindingId } }));
  }

  async listByAudit(auditId: string): Promise<AuditFinding[]> {
    return this.prisma.withRls((tx) => tx.auditFinding.findMany({ where: { auditId, deletedAt: null }, orderBy: { findingNumber: "asc" } }));
  }
}
