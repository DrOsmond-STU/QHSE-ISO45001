import { extractOriginHostname } from "./cors-origin";

describe("extractOriginHostname() — TDD §16", () => {
  it("origin https standar -> hostname polos", () => {
    expect(extractOriginHostname("https://acme.qhse.example.com")).toBe("acme.qhse.example.com");
  });

  it("origin dgn port -> port diabaikan, hostname saja", () => {
    expect(extractOriginHostname("http://localhost:3000")).toBe("localhost");
  });

  it("hostname dinormalisasi lowercase", () => {
    expect(extractOriginHostname("https://ACME.Example.COM")).toBe("acme.example.com");
  });

  it("origin bukan URL valid -> null (fail-safe, bukan throw)", () => {
    expect(extractOriginHostname("bukan-url-sama-sekali")).toBeNull();
  });

  it("string kosong -> null", () => {
    expect(extractOriginHostname("")).toBeNull();
  });
});
