import type { JobStatusResponse } from "../lib/api";

export type ProgressPhase =
  | "idle"
  | "creating"
  | "uploading"
  | "finalizing"
  | "polling"
  | "reportLoading"
  | "report";

interface ProgressViewProps {
  phase: ProgressPhase;
  jobId?: string | null;
  status?: JobStatusResponse | null;
  isPolling: boolean;
  requestId?: string | null;
}

const STEPS = [
  { key: "uploading", label: "Uploading" },
  { key: "processing", label: "Processing" },
  { key: "complete", label: "Complete" },
] as const;

function stepIndex(phase: ProgressPhase, status?: JobStatusResponse | null): number {
  if (status?.status === "FAILED") return 1;
  if (phase === "report") return 2;
  if (phase === "polling" || phase === "reportLoading") return 1;
  if (phase === "creating" || phase === "uploading" || phase === "finalizing") return 0;
  return -1;
}

export function ProgressView({
  phase,
  jobId,
  status,
  isPolling,
  requestId,
}: ProgressViewProps) {
  const currentStep = stepIndex(phase, status);
  const failed = status?.status === "FAILED";

  if (phase === "idle" && !failed) {
    return null;
  }

  if (failed) {
    return (
      <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-4 text-sm">
        <p className="font-medium text-red-100">
          We couldn&apos;t analyze that video. Please try a shorter clip.
        </p>
        {requestId && (
          <p className="mt-2 text-xs text-red-200/80">
            Request ID: <span className="font-mono">{requestId}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-[color:var(--pm-border-subtle)] bg-[color:var(--pm-surface-soft)]/80 px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isActive = currentStep === idx;
          const isComplete = currentStep > idx;
          return (
            <div
              key={step.key}
              className="flex flex-1 items-center gap-2 last:flex-none"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  isComplete
                    ? "bg-emerald-500/20 text-emerald-700"
                    : isActive
                      ? "bg-[color:var(--pm-accent)] text-[color:var(--pm-text-main)]"
                      : "bg-[color:var(--pm-surface)] text-[color:var(--pm-text-muted)] border border-[color:var(--pm-border-subtle)]/70"
                }`}
              >
                {isComplete ? "✓" : stepNum}
              </div>
              <span
                className={`text-sm ${
                  isActive
                    ? "font-medium text-[color:var(--pm-text-main)]"
                    : "text-[color:var(--pm-text-muted)]"
                }`}
              >
                {step.label}
              </span>
              {idx < STEPS.length - 1 && (
                <div
                  className={`ml-1 h-0.5 flex-1 rounded ${
                    isComplete
                      ? "bg-emerald-500/40"
                      : "bg-[color:var(--pm-border-subtle)]/60"
                  }`}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
      {isPolling && currentStep === 1 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-[color:var(--pm-text-muted)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--pm-accent)]" />
          Analyzing your video…
        </p>
      )}
    </div>
  );
}
