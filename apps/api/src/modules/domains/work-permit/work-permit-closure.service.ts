import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, WorkPermitClosure } from "@prisma/client";
import { NotificationService } from "../../../platform/notification/notification.service";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./work-permit-context";
import { assertClosureReadyForClosed } from "./work-permit-closure-rules";
import { validateWorkPermitStatusTransition } from "./work-permit-lifecycle";

export interface SubmitWorkPermitClosureInput {
  areaSafetyChecklist: Prisma.InputJsonValue;
  isolationRemovedConfirmed: boolean;
  requesterSignoffBy: string;
}

// Task 3.4 (Modul 06 §4 poin 9/§5/§6 BR-06). BELUM ada controller HTTP —
// work_permit.closure.* sudah di-seed RBAC baseline (task 142). TIDAK ADA
// workflow_instance (BEDA dari extensions) — verifikasi closure adalah
// tindakan LANGSUNG satu orang (Issuer), pola sama HIRADC self-verify (3.2).
@Injectable()
export class WorkPermitClosureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * PRD §5 "1 record penutupan final per permit (percobaan return dicatat
   * via status)" — upsert-by-workPermitId: baris PERTAMA (belum ada
   * closure) ATAU REVISI setelah RETURNED (baris SAMA, status kembali
   * SUBMITTED) — KEDUANYA berangkat dari work_permits.status=ACTIVE
   * (RETURNED sudah mengembalikan permit ke ACTIVE, lihat verify() di
   * bawah), jadi SATU validasi transisi ACTIVE->PENDING_CLOSURE cukup
   * utk kedua jalur.
   */
  async submit(workPermitId: string, input: SubmitWorkPermitClosureInput): Promise<WorkPermitClosure> {
    const createdBy = requireActorUserId();
    const tenantId = requireTenantId();

    return this.prisma.withRls(async (tx) => {
      const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
      const existing = await tx.workPermitClosure.findUnique({ where: { workPermitId } });
      if (existing && existing.status !== "RETURNED") {
        throw new BadRequestException(`work_permit_closures utk permit ini sudah berstatus ${existing.status}, tidak dapat disubmit ulang.`);
      }
      validateWorkPermitStatusTransition(permit.status, "PENDING_CLOSURE");

      const closureData = {
        areaSafetyChecklist: input.areaSafetyChecklist,
        isolationRemovedConfirmed: input.isolationRemovedConfirmed,
        requesterSignoffBy: input.requesterSignoffBy,
        requesterSignoffAt: new Date(),
        status: "SUBMITTED" as const,
        verifiedBy: null,
        verifiedAt: null,
        updatedBy: createdBy,
      };

      const closure = existing
        ? await tx.workPermitClosure.update({ where: { workPermitId }, data: closureData })
        : await tx.workPermitClosure.create({ data: { tenantId, workPermitId, ...closureData, createdBy } });

      await tx.workPermit.update({ where: { id: workPermitId }, data: { status: "PENDING_CLOSURE", updatedBy: createdBy } });
      return closure;
    });
  }

  /**
   * BR-06 — decision=VERIFIED menegakkan gate SEBELUM tulis apa pun
   * (assertClosureReadyForClosed) lalu menaikkan closure.status=VERIFIED
   * DAN work_permits.status=CLOSED SATU TRANSAKSI (PRD §6 membaca kedua
   * syarat sbg SATU gate compound utk transisi yang SAMA, bukan 2 langkah
   * terpisah) — actualEndDatetime diisi di sini. decision=RETURNED
   * mengembalikan work_permits ke ACTIVE, Requester merevisi & submit()
   * ulang baris closure yang SAMA (lihat banner comment submit() di atas).
   */
  async verify(workPermitId: string, verifiedBy: string, decision: "VERIFIED" | "RETURNED", notes?: string): Promise<WorkPermitClosure> {
    const updatedBy = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const closure = await tx.workPermitClosure.findUniqueOrThrow({ where: { workPermitId } });
      if (closure.status !== "SUBMITTED") {
        throw new BadRequestException(`work_permit_closures berstatus ${closure.status} tidak dapat diverifikasi (wajib SUBMITTED).`);
      }
      const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
      const type = await tx.workPermitType.findUniqueOrThrow({ where: { id: permit.workPermitTypeId }, select: { requiresLoto: true } });

      if (decision === "VERIFIED") {
        assertClosureReadyForClosed("VERIFIED", type.requiresLoto, closure.isolationRemovedConfirmed);
        validateWorkPermitStatusTransition(permit.status, "CLOSED");
        const updated = await tx.workPermitClosure.update({
          where: { workPermitId },
          data: { status: "VERIFIED", verifiedBy, verifiedAt: new Date(), notes, updatedBy },
        });
        await tx.workPermit.update({ where: { id: workPermitId }, data: { status: "CLOSED", actualEndDatetime: new Date(), updatedBy } });
        return updated;
      }

      validateWorkPermitStatusTransition(permit.status, "ACTIVE");
      const updated = await tx.workPermitClosure.update({
        where: { workPermitId },
        data: { status: "RETURNED", verifiedBy, verifiedAt: new Date(), notes, updatedBy },
      });
      await tx.workPermit.update({ where: { id: workPermitId }, data: { status: "ACTIVE", updatedBy } });
      return updated;
    });
  }

  /**
   * PRD §8 "Permit ditutup -> Requester, HSE -> 'Permit {permit_number}
   * telah CLOSED'". "HSE" diresolusi via role HSE_MANAGER (pola sama
   * risk-register-review-scan.service.ts, 3.2) — panggil method ini
   * SETELAH verify() berhasil dgn decision=VERIFIED (TIDAK digabung ke
   * dalam verify() itu sendiri supaya verify() tetap murni transisi
   * status, notifikasi terpisah spt WorkPermitWorkflowCompletionListener
   * memisahkan status-write dari enqueue()).
   */
  async notifyClosed(workPermitId: string): Promise<void> {
    const tenantId = requireTenantId();
    const { permitNumber, requesterId, hseManagerIds } = await this.prisma.withRls(async (tx) => {
      const permit = await tx.workPermit.findUniqueOrThrow({ where: { id: workPermitId } });
      const hseManagers = await tx.user.findMany({
        where: { tenantId, status: "ACTIVE", userRoles: { some: { role: { roleCode: "HSE_MANAGER" } } } },
        select: { id: true },
      });
      return { permitNumber: permit.permitNumber, requesterId: permit.requesterId, hseManagerIds: hseManagers.map((m) => m.id) };
    });

    const recipients = new Set([requesterId, ...hseManagerIds]);
    for (const recipientUserId of recipients) {
      await this.notificationService.enqueue({
        eventType: "WORK_PERMIT_CLOSED",
        entityType: "WORK_PERMIT",
        entityId: workPermitId,
        recipientUserId,
        priority: "MEDIUM",
        eventCategory: "WORK_PERMIT",
        variables: { permitNumber },
      });
    }
  }

  async getByPermit(workPermitId: string): Promise<WorkPermitClosure> {
    return this.prisma.withRls((tx) => tx.workPermitClosure.findUniqueOrThrow({ where: { workPermitId } }));
  }
}
