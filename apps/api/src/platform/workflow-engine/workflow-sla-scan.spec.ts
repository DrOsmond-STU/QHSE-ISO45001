import { randomUUID } from "node:crypto";
import { decideEscalation, findOverdueTasks, OverdueTaskCandidate } from "./workflow-sla-scan";

function candidate(overrides: Partial<OverdueTaskCandidate> = {}): OverdueTaskCandidate {
  return {
    taskId: randomUUID(),
    createdAt: new Date("2026-07-24T00:00:00Z"),
    escalatedAt: null,
    slaHours: 24,
    escalationAction: "NOTIFY_SUPERIOR",
    escalationRoleId: null,
    ...overrides,
  };
}

describe("findOverdueTasks — eskalasi SLA", () => {
  const now = new Date("2026-07-25T06:00:00Z"); // 30 jam setelah createdAt di atas

  it("task yang melewati sla_hours masuk daftar overdue", () => {
    const task = candidate({ slaHours: 24 }); // 30 jam > 24 jam SLA
    expect(findOverdueTasks([task], now)).toEqual([task]);
  });

  it("task yang belum melewati sla_hours TIDAK masuk daftar", () => {
    const task = candidate({ slaHours: 48 }); // 30 jam < 48 jam SLA
    expect(findOverdueTasks([task], now)).toEqual([]);
  });

  it("task escalationAction=NONE tidak pernah dianggap overdue meski lewat SLA", () => {
    const task = candidate({ slaHours: 1, escalationAction: "NONE" });
    expect(findOverdueTasks([task], now)).toEqual([]);
  });

  it("idempotency natural-key: task yang sudah punya escalatedAt dikecualikan permanen", () => {
    const task = candidate({ slaHours: 1, escalatedAt: new Date("2026-07-24T12:00:00Z") });
    expect(findOverdueTasks([task], now)).toEqual([]);
  });

  it("tepat di batas SLA (deadline == now) belum overdue (strict less-than)", () => {
    const createdAt = new Date("2026-07-24T00:00:00Z");
    const task = candidate({ createdAt, slaHours: 30 }); // deadline == now persis
    expect(findOverdueTasks([task], now)).toEqual([]);
  });
});

describe("decideEscalation", () => {
  it("NOTIFY_SUPERIOR -> tidak reassign", () => {
    const task = candidate({ escalationAction: "NOTIFY_SUPERIOR", escalationRoleId: randomUUID() });
    expect(decideEscalation(task).reassignToRoleId).toBeNull();
  });

  it("AUTO_ESCALATE dengan escalationRoleId -> reassign ke role itu", () => {
    const roleId = randomUUID();
    const task = candidate({ escalationAction: "AUTO_ESCALATE", escalationRoleId: roleId });
    expect(decideEscalation(task).reassignToRoleId).toBe(roleId);
  });

  it("AUTO_ESCALATE TANPA escalationRoleId -> graceful degrade (tidak reassign, bukan silent no-op)", () => {
    const task = candidate({ escalationAction: "AUTO_ESCALATE", escalationRoleId: null });
    const decision = decideEscalation(task);
    expect(decision.reassignToRoleId).toBeNull();
    expect(decision.action).toBe("AUTO_ESCALATE"); // action tetap dilaporkan, event tetap emit
  });
});
