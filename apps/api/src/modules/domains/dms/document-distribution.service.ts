import { Injectable } from "@nestjs/common";
import { DistributionTargetType, DocumentDistribution, Prisma } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { assertClassificationAllowsTarget, assertDocumentAcceptsNewDistribution } from "./document-distribution-rules";
import { requireActorUserId, requireTenantId } from "./dms-context";

export interface CreateDistributionInput {
  documentId: string;
  documentVersionId: string;
  distributionTargetType: DistributionTargetType;
  distributionTargetId?: string;
  requiresAcknowledgement?: boolean;
  acknowledgementDueDays?: number;
}

// Task 2.1 (Modul 03 §4.2/§5/§6) — distribusi + ekspansi target jadi
// read_acknowledgement_logs individual per user. Query LANGSUNG ke
// companies/sites/departments/users/user_roles (BUKAN impor OrganizationModule/
// RbacModule) — pola PERSIS UserService.assignRole() (1.3) &
// PrismaScopeHierarchyResolver (1.1, platform/rbac): companyId SUDAH
// didenormalisasi ke sites/departments (1.1) sejak awal justru utk query
// "semua site/department di bawah company X" jadi single-table, tanpa
// perlu reuse service module lain.
@Injectable()
export class DocumentDistributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async createDistribution(input: CreateDistributionInput): Promise<DocumentDistribution> {
    const distributedBy = requireActorUserId();
    const tenantId = requireTenantId();

    const { distribution, recipientUserIds, title, majorVersion, minorVersion } = await this.prisma.withRls(async (tx) => {
      const document = await tx.document.findUniqueOrThrow({ where: { id: input.documentId } });
      const version = await tx.documentVersion.findUniqueOrThrow({ where: { id: input.documentVersionId } });

      assertDocumentAcceptsNewDistribution(document.status);
      assertClassificationAllowsTarget(document.classification, input.distributionTargetType);

      const created = await tx.documentDistribution.create({
        data: {
          tenantId,
          documentId: input.documentId,
          documentVersionId: input.documentVersionId,
          distributionTargetType: input.distributionTargetType,
          distributionTargetId: input.distributionTargetId,
          requiresAcknowledgement: input.requiresAcknowledgement ?? true,
          acknowledgementDueDays: input.acknowledgementDueDays,
          distributedAt: new Date(),
          distributedBy,
          createdBy: distributedBy,
          updatedBy: distributedBy,
        },
      });

      const targetUserIds = await this.resolveTargetUserIds(tx, tenantId, input.distributionTargetType, input.distributionTargetId);

      if (targetUserIds.length > 0) {
        await tx.readAcknowledgementLog.createMany({
          data: targetUserIds.map((userId) => ({
            tenantId,
            documentDistributionId: created.id,
            documentVersionId: input.documentVersionId,
            userId,
            status: "PENDING" as const,
          })),
        });
      }

      return { distribution: created, recipientUserIds: targetUserIds, title: document.title, majorVersion: version.majorVersion, minorVersion: version.minorVersion };
    });

    // NotificationService.enqueue() (0.11) membuka withRls()-nya sendiri —
    // dipanggil SETELAH commit, pola sama seluruh call site lain modul ini.
    // PRD §8 "Dokumen dipublikasikan | Seluruh target distribusi | 'Dokumen
    // baru wajib dibaca'" — titik NYATA notifikasi ini terkirim (lihat
    // banner comment DocumentWorkflowCompletionListener.publishVersion()
    // kenapa BUKAN di titik publish itu sendiri).
    for (const recipientUserId of recipientUserIds) {
      await this.notificationService.enqueue({
        eventType: "DOCUMENT_PUBLISHED",
        entityType: "DOCUMENT_VERSION",
        entityId: input.documentVersionId,
        recipientUserId,
        priority: "MEDIUM",
        eventCategory: "DOCUMENT",
        variables: { title, version: `${majorVersion}.${minorVersion}` },
      });
    }

    return distribution;
  }

  /** PRD §4.2 poin 2 — "sistem meng-expand target menjadi baris individual
   * per user yang match target PADA SAAT DISTRIBUSI (snapshot keanggotaan
   * saat itu)" — hasil dipakai SEKALI utk createMany di atas, TIDAK pernah
   * di-refresh otomatis kalau keanggotaan role/site/dept berubah belakangan
   * (snapshot literal, bukan live query). */
  private async resolveTargetUserIds(
    tx: Prisma.TransactionClient,
    tenantId: string,
    targetType: DistributionTargetType,
    targetId: string | undefined,
  ): Promise<string[]> {
    switch (targetType) {
      case "USER": {
        if (!targetId) throw new Error("distributionTargetId wajib diisi untuk target USER.");
        return [targetId];
      }
      case "ROLE": {
        if (!targetId) throw new Error("distributionTargetId wajib diisi untuk target ROLE.");
        const today = new Date();
        const assignments = await tx.userRole.findMany({
          where: { tenantId, roleId: targetId, status: "ACTIVE", validFrom: { lte: today }, OR: [{ validTo: null }, { validTo: { gte: today } }] },
          select: { userId: true },
        });
        return [...new Set(assignments.map((a) => a.userId))];
      }
      case "DEPARTMENT": {
        if (!targetId) throw new Error("distributionTargetId wajib diisi untuk target DEPARTMENT.");
        const users = await tx.user.findMany({ where: { tenantId, departmentId: targetId, status: "ACTIVE" }, select: { id: true } });
        return users.map((u) => u.id);
      }
      case "SITE": {
        if (!targetId) throw new Error("distributionTargetId wajib diisi untuk target SITE.");
        const users = await tx.user.findMany({ where: { tenantId, siteId: targetId, status: "ACTIVE" }, select: { id: true } });
        return users.map((u) => u.id);
      }
      case "COMPANY": {
        if (!targetId) throw new Error("distributionTargetId wajib diisi untuk target COMPANY.");
        const [sites, departments] = await Promise.all([
          tx.site.findMany({ where: { companyId: targetId }, select: { id: true } }),
          tx.department.findMany({ where: { companyId: targetId }, select: { id: true } }),
        ]);
        const siteIds = sites.map((s) => s.id);
        const departmentIds = departments.map((d) => d.id);
        const users = await tx.user.findMany({
          where: { tenantId, status: "ACTIVE", OR: [{ siteId: { in: siteIds } }, { departmentId: { in: departmentIds } }] },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }
      case "ALL_TENANT": {
        const users = await tx.user.findMany({ where: { tenantId, status: "ACTIVE" }, select: { id: true } });
        return users.map((u) => u.id);
      }
    }
  }
}
