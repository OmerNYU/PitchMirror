import Link from "next/link";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export default function LandingPage() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8 lg:px-12 lg:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 md:gap-20">
        {/* Hero */}
        <section
          className="grid items-center gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
          aria-labelledby="hero-heading"
        >
          <div className="space-y-6">
            <h1
              id="hero-heading"
              className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight text-[color:var(--pm-text-main)] md:text-4xl lg:text-[2.75rem]"
            >
              See how your pitch lands,{" "}
              <span className="underline decoration-[color:var(--pm-accent)] decoration-[3px] underline-offset-[6px]">
                before
              </span>{" "}
              you walk into the room.
            </h1>
            <p className="max-w-xl text-sm text-[color:var(--pm-text-muted)] md:text-base">
              Upload a short practice video and get a focused coaching report —
              voice, presence, and structure — in under a minute.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="primary" size="md">
                <Link href="/studio">Open the studio</Link>
              </Button>
              <Button asChild variant="secondary" size="md">
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>
          </div>

          {/* Hero product mock: setup left, report preview right */}
          <Card className="overflow-hidden px-0 py-0 shadow-[0_24px_56px_rgba(15,23,42,0.12)]">
            <div className="grid min-h-[280px] md:min-h-[320px] md:grid-cols-2">
              {/* Left: setup state */}
              <div className="flex flex-col gap-4 border-b border-[color:var(--pm-border-subtle)]/50 bg-[color:var(--pm-surface-soft)]/60 p-5 md:border-b-0 md:border-r md:border-[color:var(--pm-border-subtle)]/50">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pm-text-muted)]">
                  Your pitch
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-[color:var(--pm-border-subtle)]/60 bg-[color:var(--pm-surface)] px-3 py-2.5">
                    <span className="h-8 w-8 rounded-lg bg-[color:var(--pm-accent)]/20 flex items-center justify-center text-xs font-medium text-[color:var(--pm-text-main)]">
                      📹
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[color:var(--pm-text-main)]">
                        practice_pitch.mp4
                      </p>
                      <p className="text-[11px] text-[color:var(--pm-text-muted)]">
                        Ready
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[color:var(--pm-accent)]/20 px-2.5 py-1 text-[11px] font-medium text-[color:var(--pm-text-main)]">
                      Full pitch review
                    </span>
                  </div>
                </div>
                <p className="mt-auto text-[11px] text-[color:var(--pm-text-muted)]">
                  Step 1 · Upload → Step 2 · Mode → Step 3 · Report
                </p>
              </div>
              {/* Right: report preview */}
              <div className="flex flex-col gap-3 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pm-text-muted)]">
                  Coaching report
                </p>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[color:var(--pm-text-main)]">
                      78
                    </span>
                    <span className="text-xs text-[color:var(--pm-text-muted)]">
                      overall
                    </span>
                  </div>
                  <p className="text-xs text-[color:var(--pm-text-muted)] line-clamp-2">
                    Clear structure and strong opening; pacing could be tighter in the middle.
                  </p>
                </div>
                <ul className="space-y-1.5 text-[11px] text-[color:var(--pm-text-main)]">
                  <li className="flex gap-2">
                    <span className="text-[color:var(--pm-accent)]">·</span>
                    Slow down after the hook
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[color:var(--pm-accent)]">·</span>
                    One clear CTA in the close
                  </li>
                </ul>
                <div className="mt-auto flex gap-1.5">
                  <span className="rounded-md bg-[color:var(--pm-surface-soft)] px-2 py-0.5 text-[10px] text-[color:var(--pm-text-muted)]">
                    Voice
                  </span>
                  <span className="rounded-md bg-[color:var(--pm-surface-soft)] px-2 py-0.5 text-[10px] text-[color:var(--pm-text-muted)]">
                    Presence
                  </span>
                  <span className="rounded-md bg-[color:var(--pm-surface-soft)] px-2 py-0.5 text-[10px] text-[color:var(--pm-text-muted)]">
                    Content
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-6"
          aria-labelledby="how-heading"
        >
          <h2
            id="how-heading"
            className="font-[family-name:var(--font-display)] text-xl font-semibold text-[color:var(--pm-text-main)] md:text-2xl"
          >
            How it works
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--pm-text-muted)]">
            Three steps from practice video to actionable feedback.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Card className="border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface)] px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
                1 · Upload your pitch
              </p>
              <p className="mt-2 text-sm text-[color:var(--pm-text-main)]">
                Record a short practice take and upload it. A single take is enough — up to 5 minutes, MP4, MOV, or WebM.
              </p>
            </Card>
            <Card className="border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface)] px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
                2 · Choose your coaching mode
              </p>
              <p className="mt-2 text-sm text-[color:var(--pm-text-main)]">
                Focus on voice, on-camera presence, or get a full pitch review that covers delivery, presence, and structure.
              </p>
            </Card>
            <Card className="border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface)] px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
                3 · Get a focused coaching report
              </p>
              <p className="mt-2 text-sm text-[color:var(--pm-text-main)]">
                In under a minute you get top fixes with concrete drills and a short practice plan you can use right away.
              </p>
            </Card>
          </div>
        </section>

        {/* Coaching modes */}
        <section aria-labelledby="modes-heading">
          <h2
            id="modes-heading"
            className="font-[family-name:var(--font-display)] text-xl font-semibold text-[color:var(--pm-text-main)] md:text-2xl"
          >
            Coaching modes
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--pm-text-muted)]">
            Pick the kind of feedback that matters most for this run.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Card tone="soft" className="px-5 py-5">
              <p className="text-sm font-semibold text-[color:var(--pm-text-main)]">
                Audio coaching
              </p>
              <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)]">
                Pacing, clarity, and vocal delivery — best when you want to sharpen how you sound without the camera in the loop.
              </p>
            </Card>
            <Card tone="soft" className="px-5 py-5">
              <p className="text-sm font-semibold text-[color:var(--pm-text-main)]">
                Camera coaching
              </p>
              <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)]">
                Posture, eye contact, and on-camera confidence — for when presence and body language are the focus.
              </p>
            </Card>
            <Card tone="soft" className="px-5 py-5">
              <p className="text-sm font-semibold text-[color:var(--pm-text-main)]">
                Full pitch review
              </p>
              <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)]">
                Delivery, presence, and structure together — the complete read with top fixes and a practice plan.
              </p>
            </Card>
          </div>
        </section>

        {/* Why PitchMirror */}
        <section aria-labelledby="why-heading">
          <h2
            id="why-heading"
            className="font-[family-name:var(--font-display)] text-xl font-semibold text-[color:var(--pm-text-main)] md:text-2xl"
          >
            Why PitchMirror
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--pm-text-muted)]">
            Built for repeatable, actionable practice — not generic AI fluff.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface)] px-5 py-5 shadow-none">
              <p className="text-xs font-semibold text-[color:var(--pm-text-main)]">
                Deterministic baseline
              </p>
              <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)]">
                Consistent preprocessing and pipeline steps keep results repeatable so you can compare runs.
              </p>
            </Card>
            <Card className="border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface)] px-5 py-5 shadow-none">
              <p className="text-xs font-semibold text-[color:var(--pm-text-main)]">
                Amazon Nova
              </p>
              <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)]">
                Coaching feedback is generated by Amazon Nova on top of structured inputs — reliable, focused output.
              </p>
            </Card>
            <Card className="border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface)] px-5 py-5 shadow-none">
              <p className="text-xs font-semibold text-[color:var(--pm-text-main)]">
                Transcript-aware analysis
              </p>
              <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)]">
                When you provide a transcript, content feedback is grounded in your actual words for more precise suggestions.
              </p>
            </Card>
            <Card className="border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface)] px-5 py-5 shadow-none">
              <p className="text-xs font-semibold text-[color:var(--pm-text-main)]">
                Practical feedback and practice plan
              </p>
              <p className="mt-1.5 text-xs text-[color:var(--pm-text-muted)]">
                You get a structured report with top fixes, drills, and a short practice plan — not a long essay.
              </p>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section
          className="rounded-3xl border border-[color:var(--pm-border-subtle)]/60 bg-[color:var(--pm-surface-soft)]/80 px-6 py-10 text-center md:px-10 md:py-12"
          aria-labelledby="cta-heading"
        >
          <h2
            id="cta-heading"
            className="font-[family-name:var(--font-display)] text-xl font-semibold text-[color:var(--pm-text-main)] md:text-2xl"
          >
            Ready to practice?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--pm-text-muted)]">
            Built for quick, focused practice before the real pitch.
          </p>
          <div className="mt-6">
            <Button asChild variant="primary" size="md">
              <Link href="/studio">Open the studio</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
