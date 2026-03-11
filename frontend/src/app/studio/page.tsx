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
import { PitchWizard } from "../../components/pitchmirror/PitchWizard";
import { ReportSummary } from "../../components/pitchmirror/ReportSummary";
import { ReportView } from "../../components/ReportView";

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
  const [currentStep, setCurrentStep] = useState<number>(1);

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
            setCurrentStep(4);
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
      setCurrentStep(4);
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

      const transcriptText = (wizard.transcriptText ?? "").trim();
      if (transcriptText.length > 0) {
        const transcriptPayload: UploadTranscriptInput = {
          transcriptText,
        };
        await uploadTranscript(created.jobId, transcriptPayload);
      }

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
        setCurrentStep(4);
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
    <StudioLayout
      wizard={
        <div className="space-y-8">
          <PitchWizard
            wizard={wizard}
            onWizardChange={setWizard}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            phase={phase}
            isBusy={isBusy}
            formError={formError}
            onAnalyze={handleAnalyze}
            resumeJobId={resumeJobId}
            setResumeJobId={setResumeJobId}
            resumeBusy={resumeBusy}
            onResume={handleResume}
            apiError={apiError}
            pipelineErrorCode={pipelineErrorCode}
            pipelineErrorMessage={pipelineErrorMessage}
            status={status}
            jobId={jobId}
            isPolling={isPolling}
            requestId={requestId}
            report={report}
          />
          <ReportView report={report} artifactsFromJob={status?.artifacts ?? null} />
        </div>
      }
      sidebar={
        <ReportSummary
          report={report}
          artifactsFromJob={status?.artifacts ?? null}
        />
      }
    />
  );
}

