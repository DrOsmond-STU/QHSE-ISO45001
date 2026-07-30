export interface NotificationSendResult {
  providerMessageId?: string;
  raw?: unknown;
}

export interface SendEmailParams {
  toEmail: string;
  subject: string;
  body: string;
}

export interface SendChatMessageParams {
  /** Nomor WhatsApp (E.164) atau chat ID Telegram — bentuk berbeda per
   * channel, diserahkan sebagai string mentah ke adapter masing-masing. */
  toAddress: string;
  body: string;
}

export interface SendInAppParams {
  notificationId: string;
}

/**
 * TDD §10 — provider adapter pattern: interface stabil, implementasi
 * konkret per provider dapat diganti tanpa mengubah pemanggil (mis. ganti
 * provider WhatsApp Business API tanpa menyentuh 31 modul pemanggil).
 * Kredensial provider sungguhan (SMTP/WhatsApp Business API/Telegram Bot
 * API) ada di Modul 30 (API Integration) yang belum dikerjakan — lihat
 * stub-notification.provider.ts untuk implementasi default task 0.11 ini.
 */
export interface NotificationProvider {
  sendEmail(params: SendEmailParams): Promise<NotificationSendResult>;
  sendWhatsApp(params: SendChatMessageParams): Promise<NotificationSendResult>;
  sendTelegram(params: SendChatMessageParams): Promise<NotificationSendResult>;
  sendInApp(params: SendInAppParams): Promise<NotificationSendResult>;
}

export const NOTIFICATION_PROVIDER = Symbol("NOTIFICATION_PROVIDER");
