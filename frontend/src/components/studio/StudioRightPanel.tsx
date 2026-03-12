"use client";

import type {
  Mode,
  Report,
  JobStatusResponse,
  ApiErrorShape,
} from "../../lib/api";
import type { ProgressPhase } from "../ProgressView";
import { Card } from "../ui/card";
import { ProgressView } from "../ProgressView";
import { ErrorView } from "../ErrorView";
import { StudioReportView } from "./StudioReportView";

/** User-facing status derived from phase, report, and errors. */
export type StudioStatus =
  | "Ready"
  | "Uploading"
  | "Processing"
  | "Complete"
  | "Failed";

function deriveStudioStatus(
  phase: ProgressPhase,
  hasReport: boolean,
  apiError: ApiErrorShape | null,
  pipelineErrorCode: string | null,
  pipelineErrorMessage: string | null,
  jobStatus: JobStatusResponse["status"] | null
): StudioStatus {
  if (hasReport) return "Complete";
  const hasError = !!(
    apiError ||
    pipelineErrorCode ||
    pipelineErrorMessage ||
    jobStatus === "FAILED"
  );
  if (phase === "idle" && hasError) return "Failed";
  if (
    phase === "creating" ||
    phase === "uploading" ||
    phase === "finalizing"
  ) {
    return "Uploading";
  }
  if (phase === "polling" || phase === "reportLoading") return "Processing";
  return "Ready";
}

function StatusPill({ status }: { status: StudioStatus }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]"
      aria-live="polite"
    >
      Status: {status}
    </p>
  );
}

interface StudioRightPanelProps {
  phase: ProgressPhase;
  mode: Mode;
  report: Report | null;
  status: JobStatusResponse | null;
  jobId: string | null;
  isPolling: boolean;
  requestId: string | null;
  apiError: ApiErrorShape | null;
  pipelineErrorCode: string | null;
  pipelineErrorMessage: string | null;
}

function WhatYouGetContent({ mode }: { mode: Mode }) {
  switch (mode) {
    case "voice":
      return (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
            What you&apos;ll get
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)]">
            Audio coaching summary
          </h2>
          <ul className="mt-3 space-y-1.5 text-xs text-[color:var(--pm-text-muted)]">
            <li>Feedback on pacing, tone, and clarity of speech.</li>
            <li>Notes on filler words, pauses, and delivery.</li>
            <li>Targeted suggestions to strengthen your vocal presence.</li>
          </ul>
        </>
      );
    case "presence":
      return (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
            What you&apos;ll get
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)]">
            Camera coaching summary
          </h2>
          <ul className="mt-3 space-y-1.5 text-xs text-[color:var(--pm-text-muted)]">
            <li>Feedback on posture, eye contact, and energy on camera.</li>
            <li>Notes on how you come across visually.</li>
            <li>Targeted suggestions to improve your on-camera presence.</li>
          </ul>
        </>
      );
    case "full":
      return (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
            What you&apos;ll get
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)]">
            Full pitch review
          </h2>
          <ul className="mt-3 space-y-1.5 text-xs text-[color:var(--pm-text-muted)]">
            <li>1–2 paragraphs on how your pitch comes across overall.</li>
            <li>Specific notes on voice, on-camera presence, and structure.</li>
            <li>3 targeted suggestions to improve your next recording.</li>
          </ul>
        </>
      );
  }
}

export function StudioRightPanel({
  phase,
  mode,
  report,
  status,
  jobId,
  isPolling,
  requestId,
  apiError,
  pipelineErrorCode,
  pipelineErrorMessage,
}: StudioRightPanelProps) {
  const hasReport = !!report;
  const studioStatus = deriveStudioStatus(
    phase,
    hasReport,
    apiError,
    pipelineErrorCode,
    pipelineErrorMessage,
    status?.status ?? null
  );
  const isProcessing =
    phase === "creating" ||
    phase === "uploading" ||
    phase === "finalizing" ||
    phase === "polling" ||
    phase === "reportLoading";

  if (studioStatus === "Complete" && report) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <StatusPill status="Complete" />
        <StudioReportView
          report={report}
          artifactsFromJob={status?.artifacts ?? null}
        />
      </div>
    );
  }

  if (studioStatus === "Failed") {
    const jobFailureMessage =
      status?.errorMessage ?? status?.error?.message ?? null;
    return (
      <div className="space-y-4">
<Card className="px-5 py-5">
        <StatusPill status="Failed" />
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)]">
            Analysis failed
          </h2>
          <div className="mt-4">
            <ErrorView
              error={apiError}
              pipelineErrorCode={pipelineErrorCode}
              pipelineErrorMessage={pipelineErrorMessage}
            />
            {!apiError && !pipelineErrorMessage && jobFailureMessage && (
              <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                {jobFailureMessage}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="space-y-4">
        <Card className="px-5 py-5">
          <StatusPill
            status={
              phase === "polling" || phase === "reportLoading"
                ? "Processing"
                : "Uploading"
            }
          />
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)]">
            Analyzing your pitch
          </h2>
          <div className="mt-4">
            <ProgressView
              phase={phase}
              jobId={jobId}
              status={status}
              isPolling={isPolling}
              requestId={requestId}
            />
          </div>
        </Card>
        <ErrorView
          error={apiError}
          pipelineErrorCode={pipelineErrorCode}
          pipelineErrorMessage={pipelineErrorMessage}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card className="px-5 py-5">
        <StatusPill status="Ready" />
        <div className="mt-2">
          <WhatYouGetContent mode={mode} />
        </div>
      </Card>
      <Card tone="soft" className="px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
          How we handle your video
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-[color:var(--pm-text-muted)]">
          <li>Max length: 5 minutes · Max size: 500 MB.</li>
          <li>Supported formats: MP4, MOV, WebM.</li>
          <li>Analysis usually completes within 30–60 seconds.</li>
          <li>Videos are deleted automatically after processing.</li>
        </ul>
      </Card>
    </div>
  );
}
