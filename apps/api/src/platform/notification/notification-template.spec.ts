import { extractTemplateVariableNames, renderTemplate } from "./notification-template";

describe("extractTemplateVariableNames", () => {
  it("mengambil nama variabel unik dari template {{var}} datar", () => {
    expect(extractTemplateVariableNames("Halo {{name}}, permit {{permitNumber}} kadaluarsa {{expiryDate}}.")).toEqual([
      "name",
      "permitNumber",
      "expiryDate",
    ]);
  });

  it("variabel yang muncul berkali-kali hanya dihitung sekali", () => {
    expect(extractTemplateVariableNames("{{name}} - {{name}}")).toEqual(["name"]);
  });

  it("template tanpa variabel -> array kosong", () => {
    expect(extractTemplateVariableNames("Pesan statis tanpa variabel.")).toEqual([]);
  });
});

describe("renderTemplate", () => {
  it("merender {{var}} dengan value dari variables", () => {
    const result = renderTemplate("Halo {{name}}, permit {{permitNumber}} akan kadaluarsa.", {
      name: "Budi",
      permitNumber: "WP/2026/0001",
    });
    expect(result).toBe("Halo Budi, permit WP/2026/0001 akan kadaluarsa.");
  });

  it("variabel direferensikan template tapi TIDAK ada di variables -> throw eksplisit (whitelist)", () => {
    expect(() => renderTemplate("Halo {{name}}, kode rahasia: {{secretToken}}", { name: "Budi" })).toThrow(
      /secretToken/,
    );
  });

  it("variables berisi key ekstra yang TIDAK dipakai template -> tidak masalah, diabaikan", () => {
    const result = renderTemplate("Halo {{name}}", { name: "Budi", unusedKey: "apa saja" });
    expect(result).toBe("Halo Budi");
  });

  it("HTML di dalam variable (data user-generated) di-escape, bukan diinjeksi mentah", () => {
    const result = renderTemplate("Deskripsi: {{description}}", { description: "<script>alert(1)</script>" });
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("template kosong (tanpa placeholder apa pun) -> render apa adanya", () => {
    expect(renderTemplate("Pesan statis.", {})).toBe("Pesan statis.");
  });
});
