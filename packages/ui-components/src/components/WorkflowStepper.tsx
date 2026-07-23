import { IconCheck, IconCross } from "../icons";

export type StageStatus = "pending" | "current" | "approved" | "rejected" | "delegated";

export interface WorkflowStage {
  label: string;
  status: StageStatus;
  /** Stage melewati sla_hours (DESIGN §7.6) — tandai warning sebelum eskalasi otomatis. */
  slaBreached?: boolean;
}

export interface WorkflowStepperProps {
  stages: WorkflowStage[];
}

// DESIGN.md §7.6 — horizontal stepper untuk <=5 stage (workflow_instances/
// workflow_tasks, Master PRD §9). Dot BUKAN elemen interaktif (murni status
// display) — jadi tidak tunduk syarat tap-target 44px (DESIGN §11, cuma utk
// elemen interaktif); kalau nanti dibuat clickable, ukurannya wajib disesuaikan.
export function WorkflowStepper({ stages }: WorkflowStepperProps) {
  return (
    <div className="qhse-stepper">
      {stages.map((stage, i) => (
        <div key={stage.label} className={`qhse-stepper__step qhse-stepper__step--${stage.status}`}>
          {i > 0 && (
            <div
              className={`qhse-stepper__connector ${
                stage.status !== "pending" ? "qhse-stepper__connector--filled" : ""
              }`}
            />
          )}
          <div
            className={`qhse-stepper__dot ${
              stage.slaBreached ? "qhse-stepper__dot--sla-breached" : ""
            }`}
          >
            {stage.status === "approved" && <IconCheck size={12} />}
            {stage.status === "rejected" && <IconCross size={12} />}
            {(stage.status === "pending" || stage.status === "current" || stage.status === "delegated") && (
              <span>{i + 1}</span>
            )}
          </div>
          <span className="qhse-stepper__label">{stage.label}</span>
        </div>
      ))}
    </div>
  );
}
