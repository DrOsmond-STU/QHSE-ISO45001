import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationChannelCode, NotificationLanguage, NotificationPriority, NotificationTemplate, Prisma } from "@prisma/client";
import { PrismaService } from "../tenancy/prisma.service";
import { getCurrentTenantId } from "../tenancy/tenant-context";
import { QuietHoursWindow, resolveAdditionalChannels } from "./notification-channel-resolution";
import { NotificationDeliveryJobPayload } from "./notification-delivery-job.types";
import { NOTIFICATION_PROVIDER, NotificationProvider } from "./notification-provider.interface";
import { renderTemplate } from "./notification-template";
import { DEFAULT_NOTIFICATION_LANGUAGE } from "./notification.constants";
import { NotificationQueueService } from "./notification-queue.service";

// TDD §5.1/§9/§10 — tenant selalu ambient lewat tenantContextStorage,
// TIDAK ada parameter tenantId eksplisit (pola sama WorkflowEngineService
// 0.9 & NumberingService 0.10) — enqueue() ini yang dipanggil IN-PROCESS
// oleh modul domain (Phase 1+, request HTTP sungguhan sudah mengisi
// context). Job BullMQ yang di-push ke worker (proses TERPISAH) beda
// cerita — payload-nya bawa tenantId eksplisit, lihat
// notification-delivery-job.types.ts.

function requireTenantId(): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new Error("Tenant context tidak ditemukan — request ditolak (fail closed).");
  }
  return tenantId;
}

function requireSubjectTemplate(template: NotificationTemplate): string {
  if (!template.subjectTemplate) {
    throw new Error(
      `notification_templates (id=${template.id}, channel=IN_APP) tidak punya subject_template — wajib diisi untuk merender notifications.title.`,
    );
  }
  return template.subjectTemplate;
}

function toQuietHoursWindow(start: Date | null, end: Date | null): QuietHoursWindow | null {
  if (!start || !end) return null;
  return {
    startMinutes: start.getUTCHours() * 60 + start.getUTCMinutes(),
    endMinutes: end.getUTCHours() * 60 + end.getUTCMinutes(),
  };
}

export interface NotificationEvent {
  /** mis. "WORK_PERMIT_EXPIRING_SOON" (Modul 25 §9 katalog event). */
  eventType: string;
  entityType: string;
  entityId: string;
  recipientUserId: string;
  priority: NotificationPriority;
  /** Kategori dipakai cross ke notification_preferences.event_category
   * (mis. "WORK_PERMIT") — sengaja TERPISAH dari eventType (Modul 25 §5:
   * "bukan per event_type detail agar UI preferensi sederhana"). */
  eventCategory: string;
  /** Variabel Handlebars, di-whitelist ketat terhadap template (lihat
   * notification-template.ts) — TERMASUK data user-generated (mis.
   * deskripsi insiden), di-HTML-escape otomatis saat render. */
  variables: Record<string, string>;
  language?: NotificationLanguage;
}

export interface EnqueueResult {
  notificationId: string;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: NotificationQueueService,
    @Inject(NOTIFICATION_PROVIDER) private readonly provider: NotificationProvider,
  ) {}

  /**
   * Master PRD Modul 25 §4.1 — alur pengiriman notifikasi generik. IN_APP
   * (BR-02, tidak bisa dimatikan) dibuat SINKRON di dalam method ini
   * (bukan lewat BullMQ — tidak ada "provider" eksternal yang bisa gagal
   * untuk in-app, cuma insert row). Kanal tambahan (EMAIL/WHATSAPP/
   * TELEGRAM) diresolusi (BR-01/03 + quiet hours,
   * notification-channel-resolution.ts) dan di-enqueue ke `notification-queue`
   * SETELAH transaksi DB commit — fire-and-forget (NFR §11 Modul 25),
   * modul sumber tidak pernah menunggu pengiriman aktual selesai.
   *
   * Kenapa push job DI LUAR transaksi: kalau di-push DI DALAM lalu
   * transaksi rollback (mis. gagal constraint di tengah), job sudah
   * kepalang di antrian padahal baris DB-nya batal — worker akan memproses
   * job yang notification_logs-nya tidak pernah ada. Push di luar
   * memastikan urutan: baris DB PASTI commit dulu, baru job masuk antrian.
   */
  async enqueue(event: NotificationEvent): Promise<EnqueueResult> {
    const tenantId = requireTenantId();
    const language = event.language ?? DEFAULT_NOTIFICATION_LANGUAGE;
    const now = new Date();

    const { notificationId, deliveryJobs } = await this.prisma.withRls(async (tx) => {
      const recipient = await tx.user.findUniqueOrThrow({ where: { id: event.recipientUserId } });

      const inAppTemplate = await this.resolveTemplate(tx, tenantId, event.eventType, "IN_APP", language);
      const title = renderTemplate(requireSubjectTemplate(inAppTemplate), event.variables);
      const body = renderTemplate(inAppTemplate.bodyTemplate, event.variables);

      const notification = await tx.notification.create({
        data: {
          tenantId,
          recipientUserId: event.recipientUserId,
          eventType: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId,
          title,
          body,
          priority: event.priority,
        },
      });

      // sendInApp() trivial (tidak pernah gagal realistis) — dipanggil
      // langsung, bukan lewat queue/retry (lihat stub-notification.provider.ts).
      await this.provider.sendInApp({ notificationId: notification.id });
      await tx.notificationLog.create({
        data: { tenantId, notificationId: notification.id, channelCode: "IN_APP", status: "SENT", attemptCount: 1, sentAt: now },
      });

      const tenantChannels = await tx.notificationChannel.findMany({ where: { tenantId } });
      const userPreferences = await tx.notificationPreference.findMany({
        where: { tenantId, userId: event.recipientUserId, eventCategory: event.eventCategory },
      });
      const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

      const additionalChannels = resolveAdditionalChannels(
        event.priority,
        tenantChannels.map((c) => ({ channelCode: c.channelCode, isEnabled: c.isEnabled })),
        userPreferences.map((p) => ({
          channelCode: p.channelCode,
          isEnabled: p.isEnabled,
          quietHours: toQuietHoursWindow(p.quietHoursStart, p.quietHoursEnd),
        })),
        nowMinutes,
      );

      const jobs: NotificationDeliveryJobPayload[] = [];
      for (const channelCode of additionalChannels) {
        const template = await this.resolveTemplate(tx, tenantId, event.eventType, channelCode, language);
        const renderedBody = renderTemplate(template.bodyTemplate, event.variables);
        const renderedSubject = template.subjectTemplate ? renderTemplate(template.subjectTemplate, event.variables) : undefined;

        const log = await tx.notificationLog.create({
          data: { tenantId, notificationId: notification.id, channelCode, status: "QUEUED" },
        });

        jobs.push({
          tenantId,
          notificationLogId: log.id,
          channelCode,
          // Cuma EMAIL yang punya sumber data kontak sungguhan di Phase 0
          // (users.email, task 0.6) — WA/Telegram belum ada kolom kontak
          // (menyusul task 1.3 Modul 02); stub provider throw utk kedua
          // channel itu terlepas dari isi field ini (lihat
          // notification-delivery-job.types.ts).
          recipientAddress: channelCode === "EMAIL" ? recipient.email : "",
          subject: renderedSubject,
          body: renderedBody,
        });
      }

      return { notificationId: notification.id, deliveryJobs: jobs };
    });

    for (const job of deliveryJobs) {
      await this.queueService.enqueueDelivery(job);
    }

    return { notificationId };
  }

  /**
   * Modul 25 §5 relasi — fallback 2 tingkat: template khusus tenant ->
   * template default sistem (tenantId NULL). Fallback tingkat-3 PRD
   * ("bahasa default tenant kalau bahasa user tidak tersedia") SENGAJA
   * tidak diimplementasikan — bergantung konsep "bahasa default per
   * tenant" yang belum ada kolomnya (Modul 01/task 1.1 belum ada), bukan
   * gap tersembunyi, cukup scope task 0.11 tidak sampai situ.
   */
  private async resolveTemplate(
    tx: Prisma.TransactionClient,
    tenantId: string,
    eventType: string,
    channelCode: NotificationChannelCode,
    language: NotificationLanguage,
  ): Promise<NotificationTemplate> {
    const tenantSpecific = await tx.notificationTemplate.findFirst({
      where: { tenantId, eventType, channelCode, language, isActive: true },
    });
    if (tenantSpecific) return tenantSpecific;

    const systemDefault = await tx.notificationTemplate.findFirst({
      where: { tenantId: null, eventType, channelCode, language, isActive: true },
    });
    if (systemDefault) return systemDefault;

    throw new NotFoundException(
      `notification_templates tidak ditemukan untuk event_type=${eventType} channel=${channelCode} language=${language} (baik tenant maupun default sistem).`,
    );
  }
}
