import { dateToTimeString, isValidTimeString, timeStringToDate } from "./notification-time";

describe("notification-time — konversi TIME Postgres <-> string HH:mm", () => {
  it("isValidTimeString menerima format HH:mm valid", () => {
    expect(isValidTimeString("00:00")).toBe(true);
    expect(isValidTimeString("22:30")).toBe(true);
    expect(isValidTimeString("23:59")).toBe(true);
  });

  it("isValidTimeString menolak format tidak valid", () => {
    expect(isValidTimeString("24:00")).toBe(false);
    expect(isValidTimeString("12:60")).toBe(false);
    expect(isValidTimeString("9:00")).toBe(false); // wajib 2 digit
    expect(isValidTimeString("12:00:00")).toBe(false);
    expect(isValidTimeString("bukan-waktu")).toBe(false);
  });

  it("timeStringToDate null/undefined -> null", () => {
    expect(timeStringToDate(null)).toBeNull();
    expect(timeStringToDate(undefined)).toBeNull();
  });

  it("timeStringToDate menghasilkan Date dgn tanggal dasar 1970-01-01 UTC", () => {
    const date = timeStringToDate("22:30")!;
    expect(date.toISOString()).toBe("1970-01-01T22:30:00.000Z");
  });

  it("timeStringToDate melempar error utk format tidak valid", () => {
    expect(() => timeStringToDate("bukan-waktu")).toThrow();
  });

  it("dateToTimeString null/undefined -> null", () => {
    expect(dateToTimeString(null)).toBeNull();
    expect(dateToTimeString(undefined)).toBeNull();
  });

  it("dateToTimeString round-trip dgn timeStringToDate", () => {
    expect(dateToTimeString(timeStringToDate("07:05"))).toBe("07:05");
    expect(dateToTimeString(timeStringToDate("00:00"))).toBe("00:00");
  });
});
