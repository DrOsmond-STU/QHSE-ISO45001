"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stub_notification_provider_1 = require("./stub-notification.provider");
describe("StubNotificationProvider", () => {
    const provider = new stub_notification_provider_1.StubNotificationProvider();
    it("sendEmail throw eksplisit (belum ada Modul 30) — bukan silent no-op", async () => {
        await expect(provider.sendEmail({ toEmail: "a@b.com", subject: "s", body: "b" })).rejects.toThrow(/belum dikonfigurasi/);
    });
    it("sendWhatsApp throw eksplisit (belum ada Modul 30)", async () => {
        await expect(provider.sendWhatsApp({ toAddress: "+6281234567890", body: "b" })).rejects.toThrow(/belum dikonfigurasi/);
    });
    it("sendTelegram throw eksplisit (belum ada Modul 30)", async () => {
        await expect(provider.sendTelegram({ toAddress: "123456789", body: "b" })).rejects.toThrow(/belum dikonfigurasi/);
    });
    it("sendInApp selalu sukses trivial (baris notifications sudah jadi delivery-nya)", async () => {
        const result = await provider.sendInApp({ notificationId: "11111111-1111-1111-1111-111111111111" });
        expect(result.providerMessageId).toBe("11111111-1111-1111-1111-111111111111");
    });
});
//# sourceMappingURL=stub-notification.provider.spec.js.map