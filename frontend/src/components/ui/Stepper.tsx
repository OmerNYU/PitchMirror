import type React from "react";

export interface StepConfig {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepConfig[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <nav aria-label="PitchMirror steps">
      <ol className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === current;
          const isComplete = stepNumber < current;

          return (
            <li
              key={step.label}
              className="flex flex-1 items-center gap-3 sm:gap-4"
            >
              <div
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  isComplete
                    ? "bg-[color:var(--pm-accent-soft)] text-[color:var(--pm-accent)] border-[color:var(--pm-accent)]/70"
                    : isActive
                      ? "bg-[color:var(--pm-accent)] text-slate-950 border-[color:var(--pm-accent)]"
                      : "bg-[color:var(--pm-surface-soft)] text-[color:var(--pm-text-muted)] border-[color:var(--pm-border-subtle)]",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={isActive ? "step" : undefined}
              >
                {isComplete ? "✓" : stepNumber}
              </div>
              <div className="min-w-0">
                <p
                  className={[
                    "text-xs font-semibold uppercase tracking-[0.16em]",
                    isActive
                      ? "text-[color:var(--pm-text-main)]"
                      : "text-[color:var(--pm-text-muted)]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="mt-0.5 text-[11px] text-[color:var(--pm-text-muted)]">
                    {step.description}
                  </p>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="hidden h-px flex-1 rounded-full bg-[color:var(--pm-border-subtle)]/60 sm:block" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

