import { findCapaEffectivenessVerificationDue } from "./capa-effectiveness-verification-due-scan";

const now = new Date("2026-07-26T00:00:00.000Z");

describe("findCapaEffectivenessVerificationDue", () => {
  it("kembalikan verification PENDING yang due date sudah lewat", () => {
    const result = findCapaEffectivenessVerificationDue(
      [{ effectivenessVerificationId: "v1", result: "PENDING", verificationDueDate: new Date("2026-07-20"), dueReminderSentAt: null }],
      now,
    );
    expect(result).toHaveLength(1);
  });

  it("kecualikan verification yang due date belum lewat", () => {
    const result = findCapaEffectivenessVerificationDue(
      [{ effectivenessVerificationId: "v1", result: "PENDING", verificationDueDate: new Date("2026-08-01"), dueReminderSentAt: null }],
      now,
    );
    expect(result).toHaveLength(0);
  });

  it("kecualikan verification yang sudah punya result (EFFECTIVE/NOT_EFFECTIVE)", () => {
    const result = findCapaEffectivenessVerificationDue(
      [{ effectivenessVerificationId: "v1", result: "EFFECTIVE", verificationDueDate: new Date("2026-07-01"), dueReminderSentAt: null }],
      now,
    );
    expect(result).toHaveLength(0);
  });

  it("kecualikan verification yang reminder-nya sudah pernah dikirim (idempotency)", () => {
    const result = findCapaEffectivenessVerificationDue(
      [
        {
          effectivenessVerificationId: "v1",
          result: "PENDING",
          verificationDueDate: new Date("2026-07-01"),
          dueReminderSentAt: new Date("2026-07-10"),
        },
      ],
      now,
    );
    expect(result).toHaveLength(0);
  });
});
