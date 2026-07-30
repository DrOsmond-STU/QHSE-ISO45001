import { isWithinQuietHours, resolveAdditionalChannels } from "./notification-channel-resolution";

describe("isWithinQuietHours", () => {
  it("jendela normal (tidak lewat tengah malam): 09:00-17:00", () => {
    const window = { startMinutes: 9 * 60, endMinutes: 17 * 60 };
    expect(isWithinQuietHours(10 * 60, window)).toBe(true); // 10:00
    expect(isWithinQuietHours(8 * 60, window)).toBe(false); // 08:00
    expect(isWithinQuietHours(17 * 60, window)).toBe(false); // 17:00 (exclusive end)
  });

  it("jendela lewat tengah malam: 22:00-07:00", () => {
    const window = { startMinutes: 22 * 60, endMinutes: 7 * 60 };
    expect(isWithinQuietHours(23 * 60, window)).toBe(true); // 23:00
    expect(isWithinQuietHours(1 * 60, window)).toBe(true); // 01:00
    expect(isWithinQuietHours(12 * 60, window)).toBe(false); // 12:00 siang
  });

  it("start === end -> tidak pernah quiet (bukan 24 jam penuh)", () => {
    expect(isWithinQuietHours(12 * 60, { startMinutes: 0, endMinutes: 0 })).toBe(false);
  });
});

describe("resolveAdditionalChannels", () => {
  const NOON = 12 * 60;

  it("channel tenant-enabled + user-enabled + bukan quiet hours -> included", () => {
    const result = resolveAdditionalChannels(
      "MEDIUM",
      [{ channelCode: "EMAIL", isEnabled: true }],
      [{ channelCode: "EMAIL", isEnabled: true, quietHours: null }],
      NOON,
    );
    expect(result).toEqual(["EMAIL"]);
  });

  it("BR-03: tenant men-disable channel -> exclude walau user sudah opt-in", () => {
    const result = resolveAdditionalChannels(
      "MEDIUM",
      [{ channelCode: "EMAIL", isEnabled: false }],
      [{ channelCode: "EMAIL", isEnabled: true, quietHours: null }],
      NOON,
    );
    expect(result).toEqual([]);
  });

  it("user belum opt-in (tidak ada baris preferensi) -> exclude (default aman, bukan opt-out)", () => {
    const result = resolveAdditionalChannels("MEDIUM", [{ channelCode: "EMAIL", isEnabled: true }], [], NOON);
    expect(result).toEqual([]);
  });

  it("user eksplisit is_enabled=false -> exclude", () => {
    const result = resolveAdditionalChannels(
      "MEDIUM",
      [{ channelCode: "WHATSAPP", isEnabled: true }],
      [{ channelCode: "WHATSAPP", isEnabled: false, quietHours: null }],
      NOON,
    );
    expect(result).toEqual([]);
  });

  it("priority non-CRITICAL saat quiet hours -> exclude", () => {
    const result = resolveAdditionalChannels(
      "HIGH",
      [{ channelCode: "EMAIL", isEnabled: true }],
      [{ channelCode: "EMAIL", isEnabled: true, quietHours: { startMinutes: 0, endMinutes: 24 * 60 - 1 } }],
      NOON,
    );
    expect(result).toEqual([]);
  });

  it("BR-01: priority CRITICAL bypass quiet hours", () => {
    const result = resolveAdditionalChannels(
      "CRITICAL",
      [{ channelCode: "EMAIL", isEnabled: true }],
      [{ channelCode: "EMAIL", isEnabled: true, quietHours: { startMinutes: 0, endMinutes: 24 * 60 - 1 } }],
      NOON,
    );
    expect(result).toEqual(["EMAIL"]);
  });

  it("CRITICAL TIDAK memaksa channel yang tenant/user memang matikan (lihat catatan interpretasi BR-01)", () => {
    const result = resolveAdditionalChannels(
      "CRITICAL",
      [
        { channelCode: "EMAIL", isEnabled: false },
        { channelCode: "WHATSAPP", isEnabled: true },
      ],
      [{ channelCode: "WHATSAPP", isEnabled: false, quietHours: null }],
      NOON,
    );
    expect(result).toEqual([]);
  });

  it("beberapa channel sekaligus, urutan output konsisten EMAIL/WHATSAPP/TELEGRAM", () => {
    const result = resolveAdditionalChannels(
      "MEDIUM",
      [
        { channelCode: "EMAIL", isEnabled: true },
        { channelCode: "WHATSAPP", isEnabled: true },
        { channelCode: "TELEGRAM", isEnabled: true },
      ],
      [
        { channelCode: "TELEGRAM", isEnabled: true, quietHours: null },
        { channelCode: "EMAIL", isEnabled: true, quietHours: null },
        { channelCode: "WHATSAPP", isEnabled: true, quietHours: null },
      ],
      NOON,
    );
    expect(result).toEqual(["EMAIL", "WHATSAPP", "TELEGRAM"]);
  });
});
