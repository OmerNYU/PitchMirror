"use client";

import { Card } from "../ui/card";
import { Textarea } from "../ui/textarea";

interface StudioTranscriptCardProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function StudioTranscriptCard({
  value,
  onChange,
  disabled = false,
}: StudioTranscriptCardProps) {
  return (
    <Card className="px-5 py-5">
      <div className="space-y-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-[color:var(--pm-text-main)]">
            Optional transcript
          </h2>
          <p className="mt-1 text-xs text-[color:var(--pm-text-muted)]">
            Paste a transcript if you have one. We’ll use it to improve
            content-aware feedback.
          </p>
        </div>
        <Textarea
          rows={4}
          placeholder="Paste your transcript here (optional)…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="rounded-2xl border-[color:var(--pm-border-subtle)] bg-[color:var(--pm-surface-soft)]/50 text-xs text-[color:var(--pm-text-main)] placeholder:text-[color:var(--pm-text-muted)] focus:border-[color:var(--pm-accent)] focus:ring-[color:var(--pm-accent)]/30"
        />
      </div>
    </Card>
  );
}
