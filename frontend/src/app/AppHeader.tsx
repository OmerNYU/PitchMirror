"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname() ?? "/";
  const onStudio = pathname.startsWith("/studio");

  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--pm-border-subtle)]/30 bg-[color:var(--pm-bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-8">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.26em] text-[color:var(--pm-text-muted)]"
        >
          PitchMirror
        </Link>
        <nav className="flex items-center gap-2 text-xs">
          {onStudio ? (
            <Link
              href="/"
              className="rounded-full border border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface-soft)] px-3 py-1 text-[11px] text-[color:var(--pm-text-muted)] hover:bg-[color:var(--pm-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pm-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--pm-bg)]"
            >
              Back to overview
            </Link>
          ) : (
            <Link
              href="/studio"
              className="rounded-full bg-[color:var(--pm-accent)] px-4 py-1.5 text-[11px] font-medium text-slate-950 shadow-[0_14px_35px_rgba(15,23,42,0.45)] hover:bg-[color:var(--pm-accent)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pm-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--pm-bg)]"
            >
              Open the studio
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
