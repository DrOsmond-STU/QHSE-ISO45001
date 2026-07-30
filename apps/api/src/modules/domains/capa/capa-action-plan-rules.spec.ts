import { assertActionTrackingIdRequired, assertAllActionPlansCompleted } from "./capa-action-plan-rules";

describe("assertAllActionPlansCompleted (BR-02)", () => {
  it("tidak throw kalau seluruh action plan COMPLETED", () => {
    expect(() => assertAllActionPlansCompleted([{ statusCache: "COMPLETED" }, { statusCache: "COMPLETED" }])).not.toThrow();
  });

  it("throw kalau ada action plan belum COMPLETED", () => {
    expect(() => assertAllActionPlansCompleted([{ statusCache: "COMPLETED" }, { statusCache: "IN_PROGRESS" }])).toThrow(/BR-02/);
  });

  it("throw kalau belum ada action plan sama sekali", () => {
    expect(() => assertAllActionPlansCompleted([])).toThrow(/BR-02/);
  });
});

describe("assertActionTrackingIdRequired (BR-08)", () => {
  it("tidak throw kalau seluruh action plan py action_tracking_id", () => {
    expect(() =>
      assertActionTrackingIdRequired([
        { id: "p1", actionTrackingId: "at-1" },
        { id: "p2", actionTrackingId: "at-2" },
      ]),
    ).not.toThrow();
  });

  it("throw kalau ada action plan tanpa action_tracking_id", () => {
    expect(() =>
      assertActionTrackingIdRequired([
        { id: "p1", actionTrackingId: "at-1" },
        { id: "p2", actionTrackingId: null },
      ]),
    ).toThrow(/BR-08/);
  });

  it("throw kalau belum ada action plan sama sekali", () => {
    expect(() => assertActionTrackingIdRequired([])).toThrow();
  });
});
