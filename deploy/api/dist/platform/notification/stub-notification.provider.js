"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StubNotificationProvider = void 0;
const common_1 = require("@nestjs/common");
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
let StubNotificationProvider = class StubNotificationProvider {
    async sendEmail(_params) {
        throw new Error("Provider email belum dikonfigurasi — menunggu Modul 30 (API Integration).");
    }
    async sendWhatsApp(_params) {
        throw new Error("Provider WhatsApp Business API belum dikonfigurasi — menunggu Modul 30 (API Integration).");
    }
    async sendTelegram(_params) {
        throw new Error("Provider Telegram Bot API belum dikonfigurasi — menunggu Modul 30 (API Integration).");
    }
    async sendInApp(params) {
        return { providerMessageId: params.notificationId };
    }
};
exports.StubNotificationProvider = StubNotificationProvider;
exports.StubNotificationProvider = StubNotificationProvider = __decorate([
    (0, common_1.Injectable)()
], StubNotificationProvider);
//# sourceMappingURL=stub-notification.provider.js.map