import { calculateObjectiveStatus } from "./objective-status";

describe("calculateObjectiveStatus (BR-05)", () => {
  it("ON_TRACK jika deviasi persis di ambang (tidak lebih)", () => {
    expect(calculateObjectiveStatus(90, 100, 10)).toBe("ON_TRACK");
  });

  it("AT_RISK jika deviasi melebihi ambang (di atas target)", () => {
    expect(calculateObjectiveStatus(115, 100, 10)).toBe("AT_RISK");
  });

  it("AT_RISK jika deviasi melebihi ambang (di bawah target)", () => {
    expect(calculateObjectiveStatus(85, 100, 10)).toBe("AT_RISK");
  });

  it("ON_TRACK jika current_value null (belum ada progress log)", () => {
    expect(calculateObjectiveStatus(null, 100, 10)).toBe("ON_TRACK");
  });

  it("ON_TRACK jika current_value == target_value (deviasi 0)", () => {
    expect(calculateObjectiveStatus(100, 100, 10)).toBe("ON_TRACK");
  });
});
