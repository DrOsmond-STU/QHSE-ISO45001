import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("hash lalu verify dengan password yang benar berhasil", async () => {
    const hash = await service.hash("Str0ng!Passw0rd");
    await expect(service.verify(hash, "Str0ng!Passw0rd")).resolves.toBe(true);
  });

  it("verify dengan password yang salah gagal", async () => {
    const hash = await service.hash("Str0ng!Passw0rd");
    await expect(service.verify(hash, "wrong-password")).resolves.toBe(false);
  });

  it("hash tidak pernah menyimpan plaintext (hash != input)", async () => {
    const hash = await service.hash("Str0ng!Passw0rd");
    expect(hash).not.toBe("Str0ng!Passw0rd");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });
});
