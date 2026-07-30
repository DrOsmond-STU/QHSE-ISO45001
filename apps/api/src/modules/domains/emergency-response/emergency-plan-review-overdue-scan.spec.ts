import { findPlansWithOverdueReview } from "./emergency-plan-review-overdue-scan";

describe("findPlansWithOverdueReview (BR-01)", () => {
  const now = new Date("2026-07-26T00:00:00.000Z");

  it("mengembalikan array kosong kalau tidak ada kandidat overdue", () => {
    const candidates = [
      { planId: "p1", nextReviewDueDate: new Date("2026-07-20T00:00:00.000Z") }, // baru 6 hari
      { planId: "p2", nextReviewDueDate: null },
    ];
    expect(findPlansWithOverdueReview(candidates, now)).toHaveLength(0);
  });

  it("mengembalikan HANYA plan yang genuinely >30 hari overdue", () => {
    const candidates = [
      { planId: "p1", nextReviewDueDate: new Date("2026-06-01T00:00:00.000Z") }, // jauh overdue
      { planId: "p2", nextReviewDueDate: new Date("2026-07-20T00:00:00.000Z") }, // belum 30 hari
      { planId: "p3", nextReviewDueDate: new Date("2026-06-24T00:00:00.000Z") }, // >30 hari
    ];
    const result = findPlansWithOverdueReview(candidates, now);
    expect(result.map((c) => c.planId).sort()).toEqual(["p1", "p3"]);
  });
});
