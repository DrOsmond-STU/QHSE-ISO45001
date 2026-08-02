"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objective_status_1 = require("./objective-status");
describe("calculateObjectiveStatus (BR-05)", () => {
    it("ON_TRACK jika deviasi persis di ambang (tidak lebih)", () => {
        expect((0, objective_status_1.calculateObjectiveStatus)(90, 100, 10)).toBe("ON_TRACK");
    });
    it("AT_RISK jika deviasi melebihi ambang (di atas target)", () => {
        expect((0, objective_status_1.calculateObjectiveStatus)(115, 100, 10)).toBe("AT_RISK");
    });
    it("AT_RISK jika deviasi melebihi ambang (di bawah target)", () => {
        expect((0, objective_status_1.calculateObjectiveStatus)(85, 100, 10)).toBe("AT_RISK");
    });
    it("ON_TRACK jika current_value null (belum ada progress log)", () => {
        expect((0, objective_status_1.calculateObjectiveStatus)(null, 100, 10)).toBe("ON_TRACK");
    });
    it("ON_TRACK jika current_value == target_value (deviasi 0)", () => {
        expect((0, objective_status_1.calculateObjectiveStatus)(100, 100, 10)).toBe("ON_TRACK");
    });
});
