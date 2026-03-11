import type React from "react";
import { Card } from "./Card";

export interface StudioLayoutProps {
  wizard: React.ReactNode;
  sidebar: React.ReactNode;
}

export function StudioLayout({ wizard, sidebar }: StudioLayoutProps) {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8 lg:px-12 lg:py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-[color:var(--pm-border-subtle)]/60 pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--pm-text-muted)]">
              PitchMirror Studio
            </p>
            <h1 className="mt-1 text-xl font-semibold text-[color:var(--pm-text-main)] font-[family-name:var(--font-display)] md:text-2xl lg:text-[1.75rem] lg:leading-tight">
              Guided coaching for your next pitch.
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[color:var(--pm-text-muted)]">
            <span className="inline-flex items-center rounded-full border border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface-soft)] px-2.5 py-0.5">
              ~30–60s
            </span>
            <span className="inline-flex items-center rounded-full border border-[color:var(--pm-border-subtle)]/60 bg-[color:var(--pm-surface-soft)] px-2.5 py-0.5">
              Deleted after
            </span>
            <span className="inline-flex items-center rounded-full border border-[color:var(--pm-border-subtle)]/60 bg-[color:var(--pm-surface-soft)] px-2.5 py-0.5">
              5 min / 500MB
            </span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section aria-label="Setup and actions" className="space-y-5">
            {wizard}
          </section>
          <aside
            aria-label="Live summary and report"
            className="space-y-4 lg:space-y-6 lg:sticky lg:top-24 lg:self-start"
          >
            {sidebar}
          </aside>
        </div>
      </div>
    </main>
  );
}

