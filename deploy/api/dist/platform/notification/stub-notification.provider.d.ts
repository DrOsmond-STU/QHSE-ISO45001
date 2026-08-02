import { NotificationProvider, NotificationSendResult, SendChatMessageParams, SendEmailParams, SendInAppParams } from "./notification-provider.interface";
/**
 * Implementasi default task 0.11 — SEMUA channel eksternal (email/WA/
 * Telegram) sengaja BELUM tersambung ke provider sungguhan: kredensial
 * (SMTP/WhatsApp Business API/Telegram Bot API) ada di Modul 30 (API
 * Integration) yang belum dikerjakan. Bukan gap yang disembunyikan — throw
 * eksplisit ini justru skenario kegagalan REALISTIS yang dipakai
 * membuktikan acceptance criterion task 0.11 (retry -> dead-letter + entry
 * FAILED) tanpa pernah mengirim pesan sungguhan (acceptance criterion
 * kedua). Ganti implementasi ini (bukan interface-nya) begitu Modul 30
 * selesai — pola provider adapter (TDD §10) memang didesain untuk itu.
 *
 * sendInApp() BEDA: tidak ada "provider" eksternal sama sekali untuk
 * in-app — baris `notifications` ITU SENDIRI sudah jadi delivery-nya
 * (dibuat NotificationService secara sinkron, BR-02 Modul 25). Method ini
 * selalu sukses trivial, disediakan supaya `notification_logs` tetap
 * konsisten "satu log per kanal" (Modul 25 §5 relasi) walau tidak lewat
 * BullMQ queue seperti 3 channel lain.
 */
export declare class StubNotificationProvider implements NotificationProvider {
    sendEmail(_params: SendEmailParams): Promise<NotificationSendResult>;
    sendWhatsApp(_params: SendChatMessageParams): Promise<NotificationSendResult>;
    sendTelegram(_params: SendChatMessageParams): Promise<NotificationSendResult>;
    sendInApp(params: SendInAppParams): Promise<NotificationSendResult>;
}
