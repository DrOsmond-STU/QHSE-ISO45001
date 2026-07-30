import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { ScopeType } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { SCOPE_HIERARCHY_RESOLVER, ScopeHierarchyResolver } from "../../../platform/rbac/scope-hierarchy-resolver.interface";
import { scopeCovers, SCOPE_LEVEL_ORDER } from "../../../platform/rbac/scope-hierarchy";
import { isAuthorizationActive } from "./access-control-rules";
import { requireActorUserId, requireTenantId } from "./occupational-health-context";

export interface PhiAccessTargetScope {
  scopeType: ScopeType;
  scopeId: string;
}

// Modul 13 §3.1 — BR-02 dual-gate. Bagian (a) [permission RBAC
// occupational_health.medical_record.read_phi] MENUNGGU controller layer
// @RequirePermission, pola SAMA seluruh modul domain lain sesi ini (belum
// ada controller dibangun) — lihat banner comment blok Modul 13
// schema.prisma. Service INI HANYA menegakkan bagian (b): whitelist AKTIF
// di occupational_health_authorized_users, DITEGAKKAN SEKARANG (bukan
// menunggu controller) krn ini business logic domain modul ini sendiri,
// BUKAN infrastruktur RBAC generik — beda perlakuan yang SENGAJA (gap
// README menjelaskan kenapa campuran, bukan preseden "tunda semua").
@Injectable()
export class OccupationalHealthAccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SCOPE_HIERARCHY_RESOLVER) private readonly hierarchyResolver: ScopeHierarchyResolver,
    private readonly notificationService: NotificationService,
  ) {}

  /** Throws ForbiddenException kalau actor user (context ambient) TIDAK
   * punya entri AKTIF yang scope-nya mencakup targetScope. Caller (mis.
   * MedicalRecordService.getById()) WAJIB memanggil ini SEBELUM
   * mendekripsi/mengembalikan data PHI apa pun. */
  async assertPhiAccessAuthorized(targetScope: PhiAccessTargetScope): Promise<void> {
    const tenantId = requireTenantId();
    const userId = requireActorUserId();

    const rows = await this.prisma.withRls((tx) => tx.occupationalHealthAuthorizedUser.findMany({ where: { tenantId, userId } }));

    const activeRows = rows.filter((row) =>
      isAuthorizationActive({ status: row.status, expiryDate: row.expiryDate, revokedAt: row.revokedAt }, new Date()),
    );

    if (activeRows.length === 0) {
      await this.alertDeniedAttempt(tenantId, userId);
      throw new ForbiddenException(
        "Akses PHI ditolak — tidak ada otorisasi aktif di occupational_health_authorized_users (BR-02).",
      );
    }

    const directOrTenantMatch = activeRows.some((row) =>
      scopeCovers({ scopeType: row.authorizedScopeType as ScopeType, scopeId: row.authorizedScopeId }, targetScope),
    );
    if (directOrTenantMatch) {
      return;
    }

    // Pola SAMA PermissionService.hasPermission() (task 1.1) — resolusi
    // ancestor (round-trip DB) HANYA kalau ADA kandidat yang secara teoritis
    // bisa mencakup lewat hierarki (assignment di level lebih TINGGI dari target).
    const needsHierarchy = activeRows.some(
      (row) => SCOPE_LEVEL_ORDER[row.authorizedScopeType as ScopeType] < SCOPE_LEVEL_ORDER[targetScope.scopeType],
    );
    if (needsHierarchy) {
      const targetAncestors = await this.hierarchyResolver.resolveAncestors(tenantId, targetScope.scopeType, targetScope.scopeId);
      const coveredViaHierarchy = activeRows.some((row) =>
        scopeCovers({ scopeType: row.authorizedScopeType as ScopeType, scopeId: row.authorizedScopeId }, targetScope, targetAncestors),
      );
      if (coveredViaHierarchy) {
        return;
      }
    }

    await this.alertDeniedAttempt(tenantId, userId);
    throw new ForbiddenException(
      "Akses PHI ditolak — otorisasi aktif ada, tapi scope-nya tidak mencakup entitas yang diminta (BR-02).",
    );
  }

  // PRD §8 baris 7 — "Akses PHI oleh user di luar whitelist ditolak
  // (percobaan) -> Tenant Admin/DPO (alert keamanan)." Best-effort — kalau
  // enqueue() gagal, TIDAK boleh menutupi ForbiddenException asli (throw
  // di caller tetap terjadi apa pun hasil alert ini).
  private async alertDeniedAttempt(tenantId: string, deniedUserId: string): Promise<void> {
    try {
      const recipients = await this.prisma.withRls((tx) =>
        tx.user.findMany({
          where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: { in: ["TENANT_ADMIN", "COMPLIANCE_OFFICER"] } } } } },
          select: { id: true },
        }),
      );
      for (const recipient of recipients) {
        await this.notificationService.enqueue({
          eventType: "OCCUPATIONAL_HEALTH_PHI_ACCESS_DENIED",
          entityType: "OCCUPATIONAL_HEALTH_AUTHORIZED_USER",
          entityId: deniedUserId,
          recipientUserId: recipient.id,
          priority: "HIGH",
          eventCategory: "OCCUPATIONAL_HEALTH",
          variables: { deniedUserId },
        });
      }
    } catch {
      // best-effort, lihat komentar di atas.
    }
  }
}
