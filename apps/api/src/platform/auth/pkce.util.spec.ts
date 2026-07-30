import { randomBytes } from "node:crypto";
import { computeChallenge, verifyPkce } from "./pkce.util";

function randomVerifier(): string {
  return randomBytes(32).toString("base64url");
}

describe("pkce.util", () => {
  it("verifyPkce menerima verifier yang benar (S256)", () => {
    const verifier = randomVerifier();
    const challenge = computeChallenge(verifier);
    expect(verifyPkce(verifier, challenge, "S256")).toBe(true);
  });

  it("verifyPkce menolak verifier yang salah", () => {
    const challenge = computeChallenge(randomVerifier());
    expect(verifyPkce(randomVerifier(), challenge, "S256")).toBe(false);
  });

  it("verifyPkce menolak method selain S256", () => {
    const verifier = randomVerifier();
    const challenge = computeChallenge(verifier);
    expect(verifyPkce(verifier, challenge, "plain" as "S256")).toBe(false);
  });

  it("computeChallenge deterministik untuk verifier yang sama", () => {
    const verifier = randomVerifier();
    expect(computeChallenge(verifier)).toBe(computeChallenge(verifier));
  });
});
