import { computePeriodKey, renderNumberPattern } from "./numbering-pattern";

describe("computePeriodKey", () => {
  const date = new Date(Date.UTC(2026, 6, 24)); // 24 Juli 2026 (bulan 0-based)

  it("YEARLY -> tahun 4 digit", () => {
    expect(computePeriodKey("YEARLY", date)).toBe("2026");
  });

  it("MONTHLY -> tahun-bulan, bulan 2 digit zero-padded", () => {
    expect(computePeriodKey("MONTHLY", date)).toBe("2026-07");
  });

  it("NEVER -> null (tidak pernah reset)", () => {
    expect(computePeriodKey("NEVER", date)).toBeNull();
  });

  it("MONTHLY bulan Januari tetap 2 digit (01, bukan 1)", () => {
    expect(computePeriodKey("MONTHLY", new Date(Date.UTC(2026, 0, 5)))).toBe("2026-01");
  });
});

describe("renderNumberPattern", () => {
  const now = new Date(Date.UTC(2026, 6, 24)); // Q3, 24 Juli 2026

  it("contoh literal Master PRD §10: INC/JKT-01/2026/0001", () => {
    const result = renderNumberPattern("{PREFIX}/{SITE_CODE}/{YYYY}/{SEQ:4}", {
      prefix: "INC",
      sequence: 1,
      now,
      variables: { SITE_CODE: "JKT-01" },
    });
    expect(result).toBe("INC/JKT-01/2026/0001");
  });

  it("{SEQ:n} zero-pad sesuai lebar, tidak terpotong walau sequence sudah besar", () => {
    expect(renderNumberPattern("{SEQ:3}", { prefix: "X", sequence: 7, now })).toBe("007");
    expect(renderNumberPattern("{SEQ:3}", { prefix: "X", sequence: 12345, now })).toBe("12345");
  });

  it("{SEQ} tanpa lebar padding -> throw eksplisit (config pattern invalid)", () => {
    expect(() => renderNumberPattern("{PREFIX}/{SEQ}", { prefix: "X", sequence: 1, now })).toThrow(/lebar padding/);
  });

  it("token tanggal diresolusi sendiri: {MM} {QUARTER} {YYYYMMDD}", () => {
    expect(renderNumberPattern("{MM}", { prefix: "X", sequence: 1, now })).toBe("07");
    expect(renderNumberPattern("{QUARTER}", { prefix: "X", sequence: 1, now })).toBe("3");
    expect(renderNumberPattern("{YYYYMMDD}", { prefix: "X", sequence: 1, now })).toBe("20260724");
  });

  it("token custom (mis. {COMPANY_CODE}) diambil dari variables", () => {
    const result = renderNumberPattern("{PREFIX}/{COMPANY_CODE}/{SEQ:2}", {
      prefix: "PQ",
      sequence: 4,
      now,
      variables: { COMPANY_CODE: "PT-ABC" },
    });
    expect(result).toBe("PQ/PT-ABC/04");
  });

  it("token tidak dikenal dan tidak ada di variables -> throw eksplisit (bukan diam-diam biarkan literal {TOKEN})", () => {
    expect(() => renderNumberPattern("{PREFIX}/{SITE_CODE}/{SEQ:4}", { prefix: "X", sequence: 1, now })).toThrow(
      /\{SITE_CODE\}/,
    );
  });
});
