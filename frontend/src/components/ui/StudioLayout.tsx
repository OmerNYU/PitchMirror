import type React from "react";
import { Card } from "./Card";

export interface StudioLayoutProps {
  wizard: React.ReactNode;
  sidebar: React.ReactNode;
}

export function StudioLayout({ wizard, sidebar }: StudioLayoutProps) {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8 lg:px-12 lg:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-[color:var(--pm-border-subtle)]/60 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--pm-text-muted)]">
              PitchMirror Studio
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[color:var(--pm-text-main)] md:text-3xl lg:text-[2.1rem] lg:leading-tight font-[family-name:var(--font-display)]">
              Guided coaching for your next pitch.
            </h1>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--pm-text-muted)]">
            <Card
              tone="soft"
              className="flex flex-wrap items-center gap-2 border-none bg-transparent px-0 py-0 shadow-none ring-0"
            >
              <span className="inline-flex items-center rounded-full border border-[color:var(--pm-border-subtle)]/80 bg-[color:var(--pm-surface-soft)] px-3 py-1">
                ~30–60s analysis
              </span>
              <span className="inline-flex items-center rounded-full border border-[color:var(--pm-border-subtle)]/60 bg-[color:var(--pm-surface-soft)] px-3 py-1">
                Deleted after processing
              </span>
              <span className="inline-flex items-center rounded-full border border-[color:var(--pm-border-subtle)]/60 bg-[color:var(--pm-surface-soft)] px-3 py-1">
                Up to 5 min / 500MB
              </span>
            </Card>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section aria-label="Setup and actions" className="space-y-6">
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

