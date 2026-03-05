"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import type {
  ApiErrorShape,
  JobStatusResponse,
  Report,
} from "../../lib/api";
import type { ProgressPhase } from "../ProgressView";
import { ProgressView } from "../ProgressView";
import { ErrorView } from "../ErrorView";
import type { WizardFormState } from "../WizardForm";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Stepper } from "../ui/Stepper";
import { UploadCloud, ShieldCheck, CheckCircle2 } from "lucide-react";

interface PitchWizardProps {
  wizard: WizardFormState;
  onWizardChange(next: WizardFormState): void;
  currentStep: number;
  setCurrentStep(step: number): void;
  phase: ProgressPhase;
  isBusy: boolean;
  formError: string | null;
  onAnalyze(): void;
  resumeJobId: string;
  setResumeJobId(value: string): void;
  resumeBusy: boolean;
  onResume(): void;
  apiError: ApiErrorShape | null;
  pipelineErrorCode: string | null;
  pipelineErrorMessage: string | null;
  status: JobStatusResponse | null;
  jobId: string | null;
  isPolling: boolean;
  requestId: string | null;
  report: Report | null;
}

const ACCEPTED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export function PitchWizard({
  wizard,
  onWizardChange,
  currentStep,
  setCurrentStep,
  phase,
  isBusy,
  formError,
  onAnalyze,
  resumeJobId,
  setResumeJobId,
  resumeBusy,
  onResume,
  apiError,
  pipelineErrorCode,
  pipelineErrorMessage,
  status,
  jobId,
  isPolling,
  requestId,
  report,
}: PitchWizardProps) {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const isAnalyzing =
    phase === "creating" ||
    phase === "uploading" ||
    phase === "finalizing" ||
    phase === "polling" ||
    phase === "reportLoading";

  const canEdit = !isBusy;

  function update<K extends keyof WizardFormState>(
    key: K,
    value: WizardFormState[K],
  ) {
    if (!canEdit) return;
    onWizardChange({ ...wizard, [key]: value });
  }

  function handleFileSelect(file: File | null) {
    if (!file) {
      update("file", null);
      return;
    }
    update("file", file);
    setLocalError(null);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    handleFileSelect(file);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!canEdit) return;
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFileSelect(file);
  }

  function safeNextStep() {
    if (currentStep === 1) {
      if (!wizard.file) {
        setLocalError("Please add a pitch video before continuing.");
        return;
      }
    }
    if (currentStep === 2) {
      if (!wizard.mode) {
        setLocalError("Choose what you want coaching on.");
        return;
      }
    }
    if (currentStep === 3) {
      if (!wizard.consent) {
        setLocalError("Consent is required before we analyze your video.");
        return;
      }
    }
    setLocalError(null);
    setCurrentStep(Math.min(4, currentStep + 1));
  }

  function safePrevStep() {
    setLocalError(null);
    setCurrentStep(Math.max(1, currentStep - 1));
  }

  const uploadHelperLines = useMemo(
    () => [
      "Max length: 5 minutes",
      "Max size: 500 MB",
      "Formats: MP4, MOV, WebM",
      "Typical analysis time: 30–60 seconds",
      "Videos are deleted automatically after processing",
    ],
    [],
  );

  const stepCopy = useMemo(
    () => [
      {
        label: "Upload",
        description: "Add a short pitch video",
      },
      {
        label: "Coaching focus",
        description: "Choose what you want feedback on",
      },
      {
        label: "Review",
        description: "Confirm constraints and consent",
      },
      {
        label: "Analyze",
        description: "Run the coaching pass",
      },
    ],
    [],
  );

  const combinedError = localError ?? formError;

  const hasReport = !!report;

  return (
    <div className="space-y-6">
      <Stepper steps={stepCopy} current={currentStep} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentStep}
          initial={
            prefersReducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }
          }
          animate={
            prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
          }
          exit={
            prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }
          }
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-6"
        >
          {currentStep === 1 && (
            <Card className="px-5 py-5 md:px-6 md:py-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 hidden h-9 w-9 items-center justify-center rounded-full border border-[color:var(--pm-border-subtle)] bg-[color:var(--pm-surface-soft)] text-[color:var(--pm-accent)] sm:flex">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)] md:text-xl">
                      Upload a short pitch video
                    </h2>
                    <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)] md:text-sm">
                      A single take is perfect. We&apos;ll focus on clarity,
                      confidence, and how you come across on camera.
                    </p>
                  </div>

                  <label
                    className={[
                      "mt-1 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors",
                      dragActive
                        ? "border-[color:var(--pm-accent)] bg-[color:var(--pm-accent-soft)]/40"
                        : wizard.file
                          ? "border-[color:var(--pm-border-subtle)] bg-[color:var(--pm-surface-soft)]/60"
                          : "border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface-soft)]/30 hover:border-[color:var(--pm-border-subtle)]",
                      !canEdit ? "pointer-events-none opacity-60" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!canEdit) return;
                      setDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(false);
                    }}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      className="sr-only"
                      accept={ACCEPTED_TYPES.join(",")}
                      onChange={handleFileInputChange}
                      disabled={!canEdit}
                    />
                    <p className="text-sm font-medium text-[color:var(--pm-text-main)]">
                      {wizard.file ? wizard.file.name : "Drag a video here"}
                    </p>
                    <p className="mt-1 text-[11px] text-[color:var(--pm-text-muted)]">
                      …or click to choose a file from your computer.
                    </p>

                    <dl className="mt-3 grid gap-1 text-[10px] text-[color:var(--pm-text-muted)] sm:grid-cols-2">
                      {uploadHelperLines.map((line) => (
                        <div
                          key={line}
                          className="flex items-center justify-center gap-1"
                        >
                          <span className="h-1 w-1 rounded-full bg-[color:var(--pm-accent)]/70" />
                          <dd>{line}</dd>
                        </div>
                      ))}
                    </dl>
                  </label>
                </div>
              </div>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="px-5 py-5 md:px-6 md:py-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)] md:text-xl">
                      Choose what you want feedback on
                    </h2>
                    <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)] md:text-sm">
                      These modes all use the same underlying model. You&apos;re
                      just telling us where to focus.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <FocusCard
                    label="Full coaching"
                    subtitle="Voice, presence, and content together"
                    technical="Audio + video"
                    selected={wizard.mode === "full"}
                    onSelect={() => update("mode", "full")}
                    disabled={!canEdit}
                  />
                  <FocusCard
                    label="Voice coaching"
                    subtitle="Pacing, tone, filler words"
                    technical="Audio-focused analysis"
                    selected={wizard.mode === "voice"}
                    onSelect={() => update("mode", "voice")}
                    disabled={!canEdit}
                  />
                  <FocusCard
                    label="Presence coaching"
                    subtitle="Posture, eye contact, expressiveness"
                    technical="Video-focused (no audio)"
                    selected={wizard.mode === "presence"}
                    onSelect={() => update("mode", "presence")}
                    disabled={!canEdit}
                  />
                </div>

                <div className="mt-3 grid gap-3 border-t border-[color:var(--pm-border-subtle)]/60 pt-3 text-[11px] text-[color:var(--pm-text-muted)] md:grid-cols-3">
                  <TierChip
                    label="Short"
                    description="Up to 45 seconds"
                    selected={wizard.tier === "free"}
                    onSelect={() => update("tier", "free")}
                    disabled={!canEdit}
                  />
                  <TierChip
                    label="Standard"
                    description="Up to 2 minutes"
                    selected={wizard.tier === "pro"}
                    onSelect={() => update("tier", "pro")}
                    disabled={!canEdit}
                  />
                  <TierChip
                    label="Deep dive"
                    description="Up to 5 minutes"
                    selected={wizard.tier === "max"}
                    onSelect={() => update("tier", "max")}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="px-5 py-5 md:px-6 md:py-6">
              <div className="space-y-5">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)] md:text-xl">
                    Review &amp; consent
                  </h2>
                  <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)] md:text-sm">
                    A quick check that you&apos;re comfortable with how we
                    handle your video.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 text-xs text-[color:var(--pm-text-muted)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
                      Your setup
                    </p>
                    <dl className="space-y-1.5">
                      <SummaryRow
                        label="File"
                        value={
                          wizard.file ? wizard.file.name : "Not selected yet"
                        }
                      />
                      <SummaryRow
                        label="Coaching focus"
                        value={
                          wizard.mode === "full"
                            ? "Full coaching · audio + video"
                            : wizard.mode === "voice"
                              ? "Voice coaching · audio-focused"
                              : wizard.mode === "presence"
                                ? "Presence coaching · video-focused"
                                : "Not selected yet"
                        }
                      />
                      <SummaryRow
                        label="Video length"
                        value={
                          wizard.tier === "free"
                            ? "Short · up to ~45s"
                            : wizard.tier === "pro"
                              ? "Standard · up to ~2min"
                              : "Deep dive · up to ~5min"
                        }
                      />
                    </dl>
                  </div>

                  <Card tone="soft" className="space-y-3 px-4 py-3.5 text-xs">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-[color:var(--pm-accent)]" />
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
                          Privacy &amp; constraints
                        </p>
                        <ul className="mt-2 space-y-1 text-[11px] text-[color:var(--pm-text-muted)]">
                          <li>Max length: 5 minutes · Max size: 500 MB.</li>
                          <li>Formats: MP4, MOV, WebM.</li>
                          <li>
                            Analysis typically completes within 30–60 seconds.
                          </li>
                          <li>Videos are deleted automatically after processing.</li>
                        </ul>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="space-y-3 border-t border-[color:var(--pm-border-subtle)]/60 pt-3 text-xs">
                  <label className="flex items-start gap-2 text-[color:var(--pm-text-main)]">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 rounded border-[color:var(--pm-border-subtle)] bg-[color:var(--pm-surface-soft)] text-[color:var(--pm-accent)] focus:ring-[color:var(--pm-accent)]"
                      checked={wizard.consent}
                      onChange={(e) => update("consent", e.target.checked)}
                      disabled={!canEdit}
                    />
                    <span className="text-xs text-[color:var(--pm-text-main)]">
                      I&apos;m comfortable uploading this video for automated
                      analysis. I understand it will be processed only to
                      generate feedback and then deleted.
                    </span>
                  </label>
                </div>
              </div>
            </Card>
          )}

          {currentStep === 4 && (
            <Card className="px-5 py-5 md:px-6 md:py-6">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)] md:text-xl">
                      Run the analysis
                    </h2>
                    <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)] md:text-sm">
                      We&apos;ll create a one-time job, upload your video
                      directly to secure storage, and generate a concise
                      coaching summary.
                    </p>
                  </div>
                  {hasReport && (
                    <div className="hidden items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300 sm:inline-flex">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Report ready
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1 text-xs text-[color:var(--pm-text-muted)]">
                    <p>
                      When you start, we&apos;ll keep you updated as the upload
                      and analysis progress. You can resume later using the job
                      ID we return.
                    </p>
                    {requestId && (
                      <p className="mt-1 text-[11px] text-[color:var(--pm-text-muted)]">
                        Latest request ID:{" "}
                        <span className="font-mono text-[color:var(--pm-text-main)]">
                          {requestId}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={onAnalyze}
                      disabled={isBusy}
                    >
                      {isAnalyzing
                        ? "Analyzing your pitch…"
                        : "Analyze this pitch"}
                    </Button>
                    <p className="text-[11px] text-[color:var(--pm-text-muted)]">
                      Typical turnaround: 30–60 seconds.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <ProgressView
                    phase={phase}
                    jobId={jobId}
                    status={status}
                    isPolling={isPolling}
                    requestId={requestId}
                  />
                  <ErrorView
                    error={apiError}
                    pipelineErrorCode={pipelineErrorCode}
                    pipelineErrorMessage={pipelineErrorMessage}
                  />
                </div>

                <ResumeSection
                  resumeJobId={resumeJobId}
                  setResumeJobId={setResumeJobId}
                  onResume={onResume}
                  resumeBusy={resumeBusy}
                  isBusy={isBusy}
                />
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {combinedError && (
        <p className="text-[11px] text-red-300">{combinedError}</p>
      )}
    </div>
  );
}

interface FocusCardProps {
  label: string;
  subtitle: string;
  technical: string;
  selected: boolean;
  onSelect(): void;
  disabled: boolean;
}

function FocusCard({
  label,
  subtitle,
  technical,
  selected,
  onSelect,
  disabled,
}: FocusCardProps) {
  const classes = [
    "flex h-full flex-col justify-between rounded-2xl border px-3.5 py-3 text-left transition",
    selected
      ? "border-[color:var(--pm-accent)] bg-[color:var(--pm-accent-soft)]/60 shadow-[0_18px_50px_rgba(0,0,0,0.7)]"
      : "border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface-soft)]/40 hover:border-[color:var(--pm-border-subtle)]",
    disabled ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={onSelect}
      disabled={disabled}
    >
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-main)]">
          {label}
        </p>
        <p className="text-xs text-[color:var(--pm-text-muted)]">{subtitle}</p>
      </div>
      <p className="mt-2 text-[10px] text-[color:var(--pm-text-muted)]">
        {technical}
      </p>
    </button>
  );
}

interface TierChipProps {
  label: string;
  description: string;
  selected: boolean;
  onSelect(): void;
  disabled: boolean;
}

function TierChip({
  label,
  description,
  selected,
  onSelect,
  disabled,
}: TierChipProps) {
  const classes = [
    "flex flex-col rounded-full border px-3 py-2 text-left text-[11px] transition",
    selected
      ? "border-[color:var(--pm-accent)] bg-[color:var(--pm-accent-soft)]/80 text-[color:var(--pm-text-main)]"
      : "border-[color:var(--pm-border-subtle)]/60 bg-transparent text-[color:var(--pm-text-muted)] hover:border-[color:var(--pm-border-subtle)]",
    disabled ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={onSelect}
      disabled={disabled}
    >
      <span className="font-medium">{label}</span>
      <span className="mt-0.5 text-[10px]">{description}</span>
    </button>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[11px] text-[color:var(--pm-text-muted)]">{label}</dt>
      <dd className="flex-1 text-right text-[11px] text-[color:var(--pm-text-main)]">
        {value}
      </dd>
    </div>
  );
}

interface ResumeSectionProps {
  resumeJobId: string;
  setResumeJobId(value: string): void;
  onResume(): void;
  resumeBusy: boolean;
  isBusy: boolean;
}

function ResumeSection({
  resumeJobId,
  setResumeJobId,
  onResume,
  resumeBusy,
  isBusy,
}: ResumeSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pt-2 text-xs">
      <button
        type="button"
        className="text-[11px] text-[color:var(--pm-text-muted)] underline underline-offset-4 hover:text-[color:var(--pm-text-main)]"
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? "Hide resume options" : "Resume an earlier analysis"}
      </button>
      {expanded && (
        <div className="mt-3 rounded-2xl border border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface-soft)]/50 px-3.5 py-3">
          <p className="text-[11px] text-[color:var(--pm-text-muted)]">
            Enter a job ID from a previous run to continue or open its report.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              className="w-full rounded-full border border-[color:var(--pm-border-subtle)] bg-[color:var(--pm-surface-soft)] px-3 py-1.5 text-xs text-[color:var(--pm-text-main)] placeholder-[color:var(--pm-text-muted)] focus:border-[color:var(--pm-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--pm-accent)]"
              placeholder="Paste a job ID, e.g. 01HV…"
              value={resumeJobId}
              onChange={(e) => setResumeJobId(e.target.value)}
              disabled={isBusy}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={onResume}
              disabled={isBusy || resumeBusy}
            >
              {resumeBusy ? "Checking…" : "Resume by job ID"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

