import type { JobStatusResponse } from "../lib/api";

interface ProgressViewProps {
  jobId?: string | null;
  status?: JobStatusResponse | null;
  isPolling: boolean;
}

function statusLabel(status?: JobStatusResponse | null): string {
  if (!status) return "Idle";

  if (status.status === "FAILED") {
    return "Job failed";
  }

  if (status.status === "SUCCEEDED" || status.stage === "FINALIZE") {
    return "Report ready";
  }

  if (
    status.status === "UPLOADED" ||
    status.stage === "VALIDATE" ||
    status.stage === "UPLOAD"
  ) {
    return "Validating…";
  }

  if (status.status === "RUNNING") {
    return "Analyzing…";
  }

  return "Working…";
}

export function ProgressView({ jobId, status, isPolling }: ProgressViewProps) {
  const label = statusLabel(status);

  return (
    <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm">
      <div className="flex items-center gap-3">
        {isPolling ? (
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
        )}
        <div>
          <p className="font-medium text-slate-100">{label}</p>
          {status && (
            <p className="text-xs text-slate-400">
              Status:{" "}
              <span className="font-mono">
                {status.status} / {status.stage}
              </span>
            </p>
          )}
        </div>
      </div>
      {jobId && (
        <div className="ml-4 hidden text-xs text-slate-500 sm:block">
          <span className="mr-1 text-slate-400">Job:</span>
          <span className="font-mono bg-slate-900 px-2 py-0.5 rounded-full">
            {jobId}
          </span>
        </div>
      )}
    </div>
  );
}

