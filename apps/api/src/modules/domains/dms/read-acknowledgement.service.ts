import { Injectable, NotFoundException } from "@nestjs/common";
import { AcknowledgementMethod, Prisma, ReadAcknowledgementLog } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId, requireTenantId } from "./dms-context";
import { validateAcknowledgementTransition } from "./read-acknowledgement-lifecycle";

// Task 2.1 (Modul 03 §4.2/§6, BR-04) — sisi USER dari read_acknowledgement_logs
// (ekspansi/pembuatan baris ada di DocumentDistributionService). Seluruh
// method di sini SELF-SCOPE (dms.acknowledgement.acknowledge, PRD §3 "milik
// sendiri") — actingUser HARUS sama dgn ack_log.user_id, pola sama
// NotificationQueryService.markAsRead() (1.7): NotFoundException SERAGAM
// baik utk baris yang genuinely tidak ada MAUPUN milik user lain (BUKAN
// ForbiddenException utk kasus kedua) — mencegah kebocoran info keberadaan
// row, gap #31 (1.3) direplikasi di sini.
@Injectable()
export class ReadAcknowledgementService {
  constructor(private readonly prisma: PrismaService) {}

  async listPendingForCurrentUser(): Promise<ReadAcknowledgementLog[]> {
    const tenantId = requireTenantId();
    const userId = requireActorUserId();
    return this.prisma.withRls((tx) =>
      tx.readAcknowledgementLog.findMany({
        where: { tenantId, userId, status: { in: ["PENDING", "VIEWED", "OVERDUE"] } },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  async markViewed(ackLogId: string): Promise<ReadAcknowledgementLog> {
    const userId = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const log = await this.findOwnedOrThrow(tx, ackLogId, userId);
      validateAcknowledgementTransition(log.status, "VIEWED", log.acknowledgementMethod);
      return tx.readAcknowledgementLog.update({ where: { id: ackLogId }, data: { status: "VIEWED", viewedAt: new Date() } });
    });
  }

  async acknowledge(ackLogId: string, method: AcknowledgementMethod): Promise<ReadAcknowledgementLog> {
    const userId = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const log = await this.findOwnedOrThrow(tx, ackLogId, userId);
      validateAcknowledgementTransition(log.status, "ACKNOWLEDGED", method);
      return tx.readAcknowledgementLog.update({
        where: { id: ackLogId },
        data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date(), acknowledgementMethod: method },
      });
    });
  }

  private async findOwnedOrThrow(tx: Prisma.TransactionClient, ackLogId: string, userId: string): Promise<ReadAcknowledgementLog> {
    const log = await tx.readAcknowledgementLog.findUnique({ where: { id: ackLogId } });
    if (!log || log.userId !== userId) {
      throw new NotFoundException(`read_acknowledgement_logs ${ackLogId} tidak ditemukan.`);
    }
    return log;
  }
}
