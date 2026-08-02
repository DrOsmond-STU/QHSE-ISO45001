"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notification_template_1 = require("./notification-template");
describe("extractTemplateVariableNames", () => {
    it("mengambil nama variabel unik dari template {{var}} datar", () => {
        expect((0, notification_template_1.extractTemplateVariableNames)("Halo {{name}}, permit {{permitNumber}} kadaluarsa {{expiryDate}}.")).toEqual([
            "name",
            "permitNumber",
            "expiryDate",
        ]);
    });
    it("variabel yang muncul berkali-kali hanya dihitung sekali", () => {
        expect((0, notification_template_1.extractTemplateVariableNames)("{{name}} - {{name}}")).toEqual(["name"]);
    });
    it("template tanpa variabel -> array kosong", () => {
        expect((0, notification_template_1.extractTemplateVariableNames)("Pesan statis tanpa variabel.")).toEqual([]);
    });
});
describe("renderTemplate", () => {
    it("merender {{var}} dengan value dari variables", () => {
        const result = (0, notification_template_1.renderTemplate)("Halo {{name}}, permit {{permitNumber}} akan kadaluarsa.", {
            name: "Budi",
            permitNumber: "WP/2026/0001",
        });
        expect(result).toBe("Halo Budi, permit WP/2026/0001 akan kadaluarsa.");
    });
    it("variabel direferensikan template tapi TIDAK ada di variables -> throw eksplisit (whitelist)", () => {
        expect(() => (0, notification_template_1.renderTemplate)("Halo {{name}}, kode rahasia: {{secretToken}}", { name: "Budi" })).toThrow(/secretToken/);
    });
    it("variables berisi key ekstra yang TIDAK dipakai template -> tidak masalah, diabaikan", () => {
        const result = (0, notification_template_1.renderTemplate)("Halo {{name}}", { name: "Budi", unusedKey: "apa saja" });
        expect(result).toBe("Halo Budi");
    });
    it("HTML di dalam variable (data user-generated) di-escape, bukan diinjeksi mentah", () => {
        const result = (0, notification_template_1.renderTemplate)("Deskripsi: {{description}}", { description: "<script>alert(1)</script>" });
        expect(result).not.toContain("<script>");
        expect(result).toContain("&lt;script&gt;");
    });
    it("template kosong (tanpa placeholder apa pun) -> render apa adanya", () => {
        expect((0, notification_template_1.renderTemplate)("Pesan statis.", {})).toBe("Pesan statis.");
    });
});
