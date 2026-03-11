"use client";

import type { Mode } from "../../lib/api";
import { Card } from "../ui/Card";
import { Mic, Video, Sparkles } from "lucide-react";

const MODES: {
  value: Mode;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "voice",
    label: "Audio coaching",
    subtitle: "Focus on delivery, clarity, pacing, and vocal communication",
    icon: <Mic className="h-5 w-5" />,
  },
  {
    value: "presence",
    label: "Camera coaching",
    subtitle: "Focus on posture, eye contact, and on-camera presence",
    icon: <Video className="h-5 w-5" />,
  },
  {
    value: "full",
    label: "Full pitch review",
    subtitle: "Combined delivery, presence, and structure feedback",
    icon: <Sparkles className="h-5 w-5" />,
  },
];

interface StudioModeSelectorProps {
  value: Mode;
  onChange: (mode: Mode) => void;
  disabled?: boolean;
}

export function StudioModeSelector({
  value,
  onChange,
  disabled = false,
}: StudioModeSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)]">
          Coaching focus
        </h2>
        <p className="mt-1 text-xs text-[color:var(--pm-text-muted)]">
          Choose what you want feedback on. You can try a different mode on your
          next recording.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((mode) => {
          const selected = value === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => !disabled && onChange(mode.value)}
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${mode.label}: ${mode.subtitle}`}
              className={[
                "flex flex-col items-start rounded-2xl border-2 px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pm-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--pm-bg)]",
                selected
                  ? "border-[color:var(--pm-accent)] bg-[color:var(--pm-accent-soft)] shadow-[0_0_0_1px_var(--pm-accent),0_8px_24px_rgba(216,154,63,0.2)]"
                  : "border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface-soft)]/40 hover:border-[color:var(--pm-border-subtle)]",
                disabled ? "pointer-events-none opacity-60" : "cursor-pointer",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className={
                  selected
                    ? "text-[color:var(--pm-accent)]"
                    : "text-[color:var(--pm-text-muted)]"
                }
              >
                {mode.icon}
              </span>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--pm-text-main)]">
                {mode.label}
              </p>
              <p className="mt-1 text-xs text-[color:var(--pm-text-muted)] leading-snug">
                {mode.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
