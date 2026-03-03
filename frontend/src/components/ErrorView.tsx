import type { ApiErrorShape } from "../lib/api";

interface ErrorViewProps {
  title?: string;
  error?: ApiErrorShape | null;
  pipelineErrorCode?: string | null;
  pipelineErrorMessage?: string | null;
}

export function ErrorView({
  title = "Something went wrong",
  error,
  pipelineErrorCode,
  pipelineErrorMessage,
}: ErrorViewProps) {
  if (!error && !pipelineErrorCode && !pipelineErrorMessage) {
    return null;
  }

  const hasApiError = !!error;

  return (
    <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{title}</p>
        {hasApiError && (
          <span className="badge border border-red-500/40 bg-red-900/60 text-[10px]">
            {error?.code ?? "ERROR"}
          </span>
        )}
      </div>
      <div className="mt-1 space-y-1 text-xs text-red-100/90">
        {hasApiError && <p>{error?.message}</p>}
        {pipelineErrorMessage && (
          <p>
            <span className="font-semibold">Pipeline:</span>{" "}
            {pipelineErrorMessage}
          </p>
        )}
        {pipelineErrorCode && (
          <p>
            <span className="font-semibold">Error code:</span>{" "}
            {pipelineErrorCode}
          </p>
        )}
        {error?.requestId && (
          <p className="mt-1 text-[11px] text-red-200/80">
            Request ID:{" "}
            <span className="font-mono bg-red-900/40 px-1 rounded">
              {error.requestId}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

