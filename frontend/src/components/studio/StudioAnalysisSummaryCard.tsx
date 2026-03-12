"use client";

import type { Mode } from "../../lib/api";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

const MODE_LABELS: Record<Mode, string> = {
  voice: "Audio coaching",
  presence: "Camera coaching",
  full: "Full pitch review",
};

interface StudioAnalysisSummaryCardProps {
  mode: Mode;
  fileName: string | null;
  hasTranscript: boolean;
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  onStart: () => void;
  disabled?: boolean;
  isAnalyzing?: boolean;
}

export function StudioAnalysisSummaryCard({
  mode,
  fileName,
  hasTranscript,
  consent,
  onConsentChange,
  onStart,
  disabled = false,
  isAnalyzing = false,
}: StudioAnalysisSummaryCardProps) {
  const canStart =
    !!fileName && consent && !disabled && !isAnalyzing;

  return (
    <Card className="px-5 py-5">
      <div className="space-y-5">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)]">
            Ready to analyze
          </h2>
          <p className="mt-1 text-xs text-[color:var(--pm-text-muted)]">
            Review your choices and start when you’re ready.
          </p>
        </div>

        <dl className="space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-[color:var(--pm-text-muted)]">Focus</dt>
            <dd className="font-medium text-[color:var(--pm-text-main)]">
              {MODE_LABELS[mode]}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[color:var(--pm-text-muted)]">File</dt>
            <dd className="truncate font-medium text-[color:var(--pm-text-main)]">
              {fileName ?? "No file chosen"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[color:var(--pm-text-muted)]">Transcript</dt>
            <dd className="font-medium text-[color:var(--pm-text-main)]">
              {hasTranscript ? "Included" : "None"}
            </dd>
          </div>
        </dl>

        <div className="rounded-2xl border border-[color:var(--pm-border-subtle)]/60 bg-[color:var(--pm-surface-soft)]/50 px-4 py-3">
          <label className="flex cursor-pointer items-start gap-2 text-xs text-[color:var(--pm-text-main)]">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 rounded border-[color:var(--pm-border-subtle)] bg-[color:var(--pm-surface-soft)] text-[color:var(--pm-accent)] focus:ring-[color:var(--pm-accent)]"
              checked={consent}
              onChange={(e) => onConsentChange(e.target.checked)}
              disabled={disabled}
            />
            <span>
              I’m comfortable uploading this video for automated analysis. It
              will be used only to generate feedback and deleted after
              processing.
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3 pt-1">
          <Button
            variant="primary"
            size="md"
            onClick={onStart}
            disabled={!canStart}
            className="w-full sm:w-auto sm:min-w-[200px]"
          >
            {isAnalyzing ? "Analyzing your pitch…" : "Start coaching analysis"}
          </Button>
          <p className="text-[11px] text-[color:var(--pm-text-muted)]">
            Typical turnaround: 30–60 seconds.
          </p>
        </div>
      </div>
    </Card>
  );
}
