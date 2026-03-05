import type React from "react";

type Tone = "default" | "soft";

export interface CardProps {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

export function Card({ tone = "default", className, children }: CardProps) {
  const toneClasses =
    tone === "default"
      ? "bg-[color:var(--pm-surface)]/95 border-[color:var(--pm-border-subtle)]"
      : "bg-[color:var(--pm-surface-soft)]/90 border-[color:var(--pm-border-subtle)]/60";

  const classes = [
    "rounded-3xl border shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl",
    "ring-1 ring-black/40",
    toneClasses,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

