import { Injectable, NotFoundException } from "@nestjs/common";
import { Notification } from "@prisma/client";
import { PrismaService } from "../../../platform/tenancy/prisma.service";
import { requireActorUserId } from "./notification-context";

export interface ListNotificationsInput {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface ListNotificationsResult {
  data: Notification[];
  meta: { page: number; limit: number; total: number };
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Modul 25 §12 "Bell Icon In-App" / "dropdown daftar notifikasi" — sisi
 * READ yang task 0.11 SENGAJA tidak bangun (`NotificationService` 0.11
 * cuma py `enqueue()`, lihat banner comment `platform/notification/
 * notification.module.ts`). Query LANGSUNG ke tabel `notifications`
 * (dimiliki 0.11/platform, bukan modul ini) via `PrismaService` — bukan
 * impor service dari `platform/notification/*` krn TIDAK ADA method di
 * sana yang relevan (`enqueue()` murni write-side), pola query-langsung
 * yang sama dipakai berulang kali modul lain thd tabel platform (mis.
 * `PrismaScopeHierarchyResolver` 1.1).
 */
@Injectable()
export class NotificationQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listForCurrentUser(input: ListNotificationsInput = {}): Promise<ListNotificationsResult> {
    const userId = requireActorUserId();
    const page = Math.max(1, input.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, input.limit ?? DEFAULT_LIMIT));
    const where = { recipientUserId: userId, ...(input.unreadOnly ? { isRead: false } : {}) };

    return this.prisma.withRls(async (tx) => {
      const [data, total] = await Promise.all([
        tx.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
        tx.notification.count({ where }),
      ]);
      return { data, meta: { page, limit, total } };
    });
  }

  async unreadCount(): Promise<number> {
    const userId = requireActorUserId();
    return this.prisma.withRls((tx) => tx.notification.count({ where: { recipientUserId: userId, isRead: false } }));
  }

  /**
   * RLS (tenant_id) TIDAK cukup di sini — user LAIN di tenant yang SAMA
   * bisa saja menebak notificationId user lain (bukan miliknya). Validasi
   * kepemilikan eksplisit WAJIB, sama pola AttachmentService.confirm()
   * (0.12, gap TDD §26 poin 14: "FK/RLS constraint semata TIDAK CUKUP").
   * NotFoundException SERAGAM (bukan ForbiddenException terpisah) utk
   * "tidak ada" DAN "milik user lain" — mencegah kebocoran info
   * keberadaan entitas lintas user, pola sama gap TDD §26 poin 31 (1.3).
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const userId = requireActorUserId();

    return this.prisma.withRls(async (tx) => {
      const notification = await tx.notification.findUnique({ where: { id: notificationId } });
      if (!notification || notification.recipientUserId !== userId) {
        throw new NotFoundException("Notifikasi tidak ditemukan.");
      }
      if (notification.isRead) {
        return notification; // idempotent — sudah dibaca, no-op
      }
      return tx.notification.update({ where: { id: notificationId }, data: { isRead: true, readAt: new Date() } });
    });
  }

  async markAllAsRead(): Promise<{ count: number }> {
    const userId = requireActorUserId();
    return this.prisma.withRls(async (tx) => {
      const result = await tx.notification.updateMany({
        where: { recipientUserId: userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return { count: result.count };
    });
  }
}
