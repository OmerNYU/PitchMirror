import type React from "react";
import { Card } from "./Card";

export interface StudioLayoutProps {
  wizard: React.ReactNode;
  sidebar: React.ReactNode;
}

export function StudioLayout({ wizard, sidebar }: StudioLayoutProps) {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8 lg:px-12 lg:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-[color:var(--pm-border-subtle)]/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--pm-text-muted)]">
              PitchMirror Studio
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[color:var(--pm-text-main)] md:text-3xl lg:text-[2.1rem] lg:leading-tight font-[family-name:var(--font-display)]">
              Guided coaching for your next pitch.
            </h1>
          </div>
          <Card tone="soft" className="max-w-xs px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
              Designed for leaders
            </p>
            <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)]">
              Upload a short pitch and we&apos;ll return a concise coaching
              summary in under a minute.
            </p>
          </Card>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section aria-label="Upload and analysis wizard" className="space-y-6">
            {wizard}
          </section>
          <aside
            aria-label="What you’ll get and privacy"
            className="space-y-4 lg:space-y-6"
          >
            {sidebar}
          </aside>
        </div>
      </div>
    </main>
  );
}

