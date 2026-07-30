import { Injectable } from "@nestjs/common";
import { AuditorCompetencyRecord, AuditorCompetencyType } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./audit-context";

export interface CreateAuditorCompetencyRecordInput {
  userId: string;
  competencyType: AuditorCompetencyType;
  standardScope: string;
  certificationBody?: string;
  certificateNumber?: string;
  issuedDate: Date;
  expiryDate?: Date;
  relatedTrainingRecordId?: string;
}

// Task 4.1 (Modul 09 §3 "Tenant Admin/HR | audit.auditor_competency.manage",
// ISO 19011 klausul 7). BELUM ada controller HTTP. Bukti sertifikat via
// attachments generik (entity_type=auditor_competency_record, PRD §5
// catatan) — TIDAK ADA kolom/upload khusus di sini.
@Injectable()
export class AuditorCompetencyRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditorCompetencyRecordInput): Promise<AuditorCompetencyRecord> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();
    return this.prisma.withRls((tx) =>
      tx.auditorCompetencyRecord.create({
        data: {
          tenantId,
          userId: input.userId,
          competencyType: input.competencyType,
          standardScope: input.standardScope,
          certificationBody: input.certificationBody,
          certificateNumber: input.certificateNumber,
          issuedDate: input.issuedDate,
          expiryDate: input.expiryDate,
          status: "ACTIVE",
          relatedTrainingRecordId: input.relatedTrainingRecordId,
          createdBy,
          updatedBy: createdBy,
        },
      }),
    );
  }

  async revoke(competencyRecordId: string): Promise<AuditorCompetencyRecord> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.auditorCompetencyRecord.update({ where: { id: competencyRecordId }, data: { status: "REVOKED", updatedBy } }),
    );
  }

  // Dipanggil auditor-competency-expiry-scan (task 201).
  async markExpired(competencyRecordId: string): Promise<AuditorCompetencyRecord> {
    return this.prisma.withRls((tx) =>
      tx.auditorCompetencyRecord.update({ where: { id: competencyRecordId }, data: { status: "EXPIRED" } }),
    );
  }

  async getById(competencyRecordId: string): Promise<AuditorCompetencyRecord> {
    return this.prisma.withRls((tx) => tx.auditorCompetencyRecord.findUniqueOrThrow({ where: { id: competencyRecordId } }));
  }

  async listByUser(userId: string): Promise<AuditorCompetencyRecord[]> {
    return this.prisma.withRls((tx) =>
      tx.auditorCompetencyRecord.findMany({ where: { userId, deletedAt: null }, orderBy: { issuedDate: "desc" } }),
    );
  }
}
