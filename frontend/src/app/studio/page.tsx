"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ApiErrorShape,
  type JobStatusResponse,
  type Report,
  type UploadTranscriptInput,
  createJob,
  finalizeJob,
  getJobStatus,
  getReport,
  uploadToPresignedUrl,
  uploadTranscript,
} from "../../lib/api";
import {
  type WizardFormState,
  type SupportedContentType,
} from "../../components/WizardForm";
import { type ProgressPhase } from "../../components/ProgressView";
import { StudioLayout } from "../../components/ui/StudioLayout";
import { StudioModeSelector } from "../../components/studio/StudioModeSelector";
import { StudioUploadCard } from "../../components/studio/StudioUploadCard";
import { StudioTranscriptCard } from "../../components/studio/StudioTranscriptCard";
import { StudioAnalysisSummaryCard } from "../../components/studio/StudioAnalysisSummaryCard";
import { StudioRightPanel } from "../../components/studio/StudioRightPanel";
import { Button } from "../../components/ui/Button";

type Phase = ProgressPhase;

export default function StudioPage() {
  const [wizard, setWizard] = useState<WizardFormState>({
    file: null,
    mode: "full",
    tier: "free",
    consent: false,
    transcriptText: "",
    pitchGoal: "",
  });

  const [phase, setPhase] = useState<Phase>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatusResponse | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pipelineStart, setPipelineStart] = useState<string | null>(null);

  const [apiError, setApiError] = useState<ApiErrorShape | null>(null);
  const [pipelineErrorCode, setPipelineErrorCode] = useState<string | null>(
    null,
  );
  const [pipelineErrorMessage, setPipelineErrorMessage] = useState<
    string | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [resumeJobId, setResumeJobId] = useState("");
  const [resumeBusy, setResumeBusy] = useState(false);

  const isBusy = useMemo(
    () =>
      ["creating", "uploading", "finalizing", "polling", "reportLoading"].includes(
        phase,
      ),
    [phase],
  );

  const isPolling = phase === "polling" || phase === "reportLoading";

  const resetErrors = () => {
    setApiError(null);
    setPipelineErrorCode(null);
    setPipelineErrorMessage(null);
    setFormError(null);
  };

  const startPoll = useCallback(
    (id: string) => {
      setPhase("polling");
      setJobId(id);
    },
    [setPhase, setJobId],
  );

  useEffect(() => {
    if (!jobId || phase !== "polling") return;

    let timeoutId: number | undefined;
    let cancelled = false;

    const pollOnce = async () => {
      if (!jobId) return;
      try {
        const s = await getJobStatus(jobId);
        if (cancelled) return;
        setStatus(s);

        if (s.status === "SUCCEEDED") {
          setPhase("reportLoading");

          try {
            const r = await getReportWithRetry(jobId, 3);
            if (cancelled) return;
            setReport(r);
            setPhase("report");
          } catch (err) {
            if (cancelled) return;
            setApiError(
              (err as ApiErrorShape) ?? {
                code: "REPORT_ERROR",
                message: "Failed to fetch report",
                httpStatus: 0,
              },
            );
            setPhase("idle");
          }
          return;
        }

        if (s.status === "FAILED") {
          setPhase("idle");
          return;
        }

        timeoutId = window.setTimeout(pollOnce, 1500);
      } catch (err) {
        if (cancelled) return;
        setApiError(err as ApiErrorShape);
        timeoutId = window.setTimeout(pollOnce, 3000);
      }
    };

    pollOnce();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [jobId, phase]);

  async function getReportWithRetry(
    id: string,
    retries: number,
  ): Promise<Report> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await getReport(id);
      } catch (err) {
        const e = err as ApiErrorShape;
        const isConflict = e.httpStatus === 409 || e.code === "REPORT_NOT_READY";
        if (!isConflict || attempt === retries) {
          throw err;
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
    throw new Error("Unable to fetch report");
  }

  async function handleAnalyze() {
    resetErrors();
    setReport(null);
    setStatus(null);
    setRequestId(null);
    setPipelineStart(null);

    if (!wizard.file) {
      setFormError("Please select a video file.");
      return;
    }
    if (!wizard.consent) {
      setFormError("Consent is required to start analysis.");
      return;
    }
    if (!wizard.file.type) {
      setFormError("Selected file has no content type.");
      return;
    }

    const contentType = wizard.file.type as SupportedContentType;

    try {
      setPhase("creating");
      const created = await createJob({
        mode: wizard.mode,
        tier: wizard.tier,
        consent: true,
        contentType,
      });

      setJobId(created.jobId);
      setRawKey(created.rawKey);
      setStatus({
        jobId: created.jobId,
        status: created.status,
        stage: created.stage,
        mode: wizard.mode,
        tier: wizard.tier,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setPhase("uploading");
      await uploadToPresignedUrl({
        url: created.upload.url,
        file: wizard.file,
        contentType: created.upload.requiredHeaders["content-type"],
      });

      const transcriptText = (wizard.transcriptText ?? "").trim();
      if (transcriptText.length > 0) {
        const transcriptPayload: UploadTranscriptInput = {
          transcriptText,
        };
        await uploadTranscript(created.jobId, transcriptPayload);
      }

      setPhase("finalizing");
      const finalized = await finalizeJob({
        jobId: created.jobId,
        rawKey: created.rawKey,
      });

      setRequestId(finalized.requestId ?? null);
      setPipelineStart(finalized.pipelineStart ?? null);

      if (finalized.pipelineStart === "failed") {
        setPipelineErrorCode(finalized.errorCode ?? null);
        setPipelineErrorMessage(finalized.errorMessage ?? null);
        setPhase("idle");
        return;
      }

      startPoll(created.jobId);
    } catch (err) {
      const e = err as ApiErrorShape;
      setApiError(e);
      if (e?.requestId) setRequestId(e.requestId);
      setPhase("idle");
    }
  }

  async function handleResume() {
    resetErrors();
    setReport(null);
    setStatus(null);

    const trimmed = resumeJobId.trim();
    if (!trimmed) {
      setFormError("Enter a job ID to resume.");
      return;
    }

    setResumeBusy(true);
    try {
      const s = await getJobStatus(trimmed);
      setJobId(trimmed);
      setStatus(s);

      if (s.status === "SUCCEEDED") {
        setPhase("reportLoading");
        const r = await getReportWithRetry(trimmed, 3);
        setReport(r);
        setPhase("report");
        return;
      }

      if (s.status === "FAILED") {
        setPhase("idle");
        return;
      }

      startPoll(trimmed);
    } catch (err) {
      setApiError(err as ApiErrorShape);
      setPhase("idle");
    } finally {
      setResumeBusy(false);
    }
  }

  const leftColumn = (
    <div className="space-y-6">
      <StudioModeSelector
        value={wizard.mode}
        onChange={(mode) => setWizard((prev) => ({ ...prev, mode }))}
        disabled={isBusy}
      />
      <StudioUploadCard
        mode={wizard.mode}
        file={wizard.file}
        onFileChange={(file) => setWizard((prev) => ({ ...prev, file }))}
        disabled={isBusy}
      />
      <StudioTranscriptCard
        value={wizard.transcriptText ?? ""}
        onChange={(transcriptText) =>
          setWizard((prev) => ({ ...prev, transcriptText }))
        }
        disabled={isBusy}
      />
      <StudioAnalysisSummaryCard
        mode={wizard.mode}
        fileName={wizard.file?.name ?? null}
        hasTranscript={(wizard.transcriptText ?? "").trim().length > 0}
        consent={wizard.consent}
        onConsentChange={(consent) =>
          setWizard((prev) => ({ ...prev, consent }))
        }
        onStart={handleAnalyze}
        disabled={isBusy}
        isAnalyzing={isBusy}
      />
      {formError && (
        <p className="text-[11px] text-red-600" role="alert">
          {formError}
        </p>
      )}
      <ResumeSection
        resumeJobId={resumeJobId}
        setResumeJobId={setResumeJobId}
        onResume={handleResume}
        resumeBusy={resumeBusy}
        isBusy={isBusy}
      />
    </div>
  );

  const rightColumn = (
    <StudioRightPanel
      phase={phase}
      mode={wizard.mode}
      report={report}
      status={status}
      jobId={jobId}
      isPolling={isPolling}
      requestId={requestId}
      apiError={apiError}
      pipelineErrorCode={pipelineErrorCode}
      pipelineErrorMessage={pipelineErrorMessage}
    />
  );

  return (
    <StudioLayout wizard={leftColumn} sidebar={rightColumn} />
  );
}

function ResumeSection({
  resumeJobId,
  setResumeJobId,
  onResume,
  resumeBusy,
  isBusy,
}: {
  resumeJobId: string;
  setResumeJobId: (value: string) => void;
  onResume: () => void;
  resumeBusy: boolean;
  isBusy: boolean;
}) {
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
              className="w-full rounded-full border border-[color:var(--pm-border-subtle)] bg-[color:var(--pm-surface-soft)] px-3 py-1.5 text-xs text-[color:var(--pm-text-main)] placeholder:text-[color:var(--pm-text-muted)] focus:border-[color:var(--pm-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--pm-accent)]"
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
