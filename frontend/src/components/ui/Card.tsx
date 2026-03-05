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
      ? "bg-[color:var(--pm-surface)] border-[color:var(--pm-border-subtle)]"
      : "bg-[color:var(--pm-surface-soft)] border-[color:var(--pm-border-subtle)]/70";

  const classes = [
    "rounded-3xl border shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-xl",
    "ring-1 ring-[color:var(--pm-border-subtle)]/40",
    toneClasses,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

