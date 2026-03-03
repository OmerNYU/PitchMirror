"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ApiErrorShape,
  type JobStatusResponse,
  type Report,
  createJob,
  finalizeJob,
  getJobStatus,
  getReport,
  uploadToPresignedUrl,
} from "../lib/api";
import {
  type WizardFormState,
  type SupportedContentType,
  WizardForm,
} from "../components/WizardForm";
import { type ProgressPhase, ProgressView } from "../components/ProgressView";
import { ReportView } from "../components/ReportView";
import { ErrorView } from "../components/ErrorView";

type Phase = ProgressPhase;

export default function Page() {
  const [wizard, setWizard] = useState<WizardFormState>({
    file: null,
    mode: "full",
    tier: "free",
    consent: false,
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
    null
  );
  const [pipelineErrorMessage, setPipelineErrorMessage] = useState<
    string | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [resumeJobId, setResumeJobId] = useState("");
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeExpanded, setResumeExpanded] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const isBusy = useMemo(
    () =>
      ["creating", "uploading", "finalizing", "polling", "reportLoading"].includes(
        phase
      ),
    [phase]
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
    [setPhase, setJobId]
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
              }
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
    retries: number
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
        // simple backoff
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

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <WizardForm
          state={wizard}
          onChange={setWizard}
          onAnalyze={handleAnalyze}
          busy={isBusy}
          errorText={formError}
        />

        <div>
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

        <div className="mt-4">
          <button
            type="button"
            className="text-sm text-slate-400 hover:text-slate-300 underline"
            onClick={() => setResumeExpanded((e) => !e)}
          >
            {resumeExpanded ? "Hide" : "Resume an earlier analysis"}
          </button>
          {resumeExpanded && (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-[11px] text-slate-400">
                Enter your job ID to continue or view the report.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  className="input text-xs flex-1"
                  placeholder="e.g. 01HV…"
                  value={resumeJobId}
                  onChange={(e) => setResumeJobId(e.target.value)}
                  disabled={isBusy}
                />
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={handleResume}
                  disabled={isBusy || resumeBusy}
                >
                  {resumeBusy ? "Checking…" : "Resume by job ID"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-900/80"
            onClick={() => setAdvancedExpanded((e) => !e)}
          >
            <span>Advanced</span>
            <span className="text-slate-500">{advancedExpanded ? "−" : "+"}</span>
          </button>
          {advancedExpanded && (
            <div className="mt-1 rounded-xl border border-t-0 border-slate-800 bg-slate-900/40 px-4 py-3 font-mono text-xs text-slate-400">
              <dl className="space-y-1.5">
                {jobId && (
                  <>
                    <dt className="text-slate-500">jobId</dt>
                    <dd className="text-slate-300">{jobId}</dd>
                  </>
                )}
                {pipelineStart != null && (
                  <>
                    <dt className="text-slate-500">pipelineStart</dt>
                    <dd className="text-slate-300">{pipelineStart}</dd>
                  </>
                )}
                {requestId && (
                  <>
                    <dt className="text-slate-500">requestId</dt>
                    <dd className="text-slate-300">{requestId}</dd>
                  </>
                )}
                {status && (
                  <>
                    <dt className="text-slate-500">status</dt>
                    <dd className="text-slate-300">{status.status}</dd>
                    <dt className="text-slate-500">stage</dt>
                    <dd className="text-slate-300">{status.stage}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
        </div>

        <ReportView report={report} artifactsFromJob={status?.artifacts ?? null} />
      </div>
    </main>
  );
}

