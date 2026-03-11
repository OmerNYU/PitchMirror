import Link from "next/link";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export default function LandingPage() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8 lg:px-12 lg:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <section className="grid items-center gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[color:var(--pm-text-muted)]">
              AI coaching for real pitches
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight text-[color:var(--pm-text-main)] md:text-4xl lg:text-[2.75rem]">
              See how your pitch lands,{" "}
              <span className="underline decoration-[color:var(--pm-accent)] decoration-[3px] underline-offset-[6px]">
                before
              </span>{" "}
              you walk into the room.
            </h1>
            <p className="max-w-xl text-sm text-[color:var(--pm-text-muted)] md:text-base">
              PitchMirror turns a short practice video into a concise coaching
              report covering voice, presence, and structure — so you can fix
              what matters before it&apos;s live.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="primary" size="md">
                <Link href="/studio">Open Studio</Link>
              </Button>
              <p className="text-[11px] text-[color:var(--pm-text-muted)]">
                ~30–60s analysis · Videos deleted after processing
              </p>
            </div>
            <div className="mt-2 grid gap-2 text-[11px] text-[color:var(--pm-text-muted)] md:grid-cols-3">
              <div>
                <p className="font-semibold text-[color:var(--pm-text-main)]">
                  Voice
                </p>
                <p>Pacing, pauses, filler words.</p>
              </div>
              <div>
                <p className="font-semibold text-[color:var(--pm-text-main)]">
                  Presence
                </p>
                <p>Posture, eye contact, on-camera energy.</p>
              </div>
              <div>
                <p className="font-semibold text-[color:var(--pm-text-main)]">
                  Content
                </p>
                <p>Clarity, narrative, and call to action.</p>
              </div>
            </div>
          </div>

          <Card className="px-5 py-5 md:px-6 md:py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pm-text-muted)]">
              What you&apos;ll get
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)]">
              A focused coaching report from a single take.
            </h2>
            <ul className="mt-3 space-y-1.5 text-xs text-[color:var(--pm-text-muted)]">
              <li>Overall read on how your pitch lands.</li>
              <li>3–4 top fixes, with concrete drills.</li>
              <li>Voice, presence, and content breakdowns.</li>
              <li>A short practice plan for your next session.</li>
            </ul>
            <div className="mt-4 grid gap-2 rounded-2xl bg-[color:var(--pm-surface-soft)] px-3.5 py-3 text-[11px] text-[color:var(--pm-text-muted)]">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--pm-accent)]" />
                <p>Upload up to 5 minutes · MP4, MOV, WebM.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--pm-accent)]" />
                <p>We do media preprocessing, then call Amazon Nova.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--pm-accent)]" />
                <p>Videos are deleted automatically after processing.</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pm-text-muted)]">
              How it works
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <Card className="border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface)] px-4 py-4 text-xs shadow-none">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
                  1 · Upload your pitch
                </p>
                <p className="mt-1.5 text-[color:var(--pm-text-main)]">
                  Record a short practice pitch — a single take is perfect.
                </p>
              </Card>
              <Card className="border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface)] px-4 py-4 text-xs shadow-none">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
                  2 · Choose your coaching
                </p>
                <p className="mt-1.5 text-[color:var(--pm-text-main)]">
                  Focus on voice, on-camera presence, or a full pitch review.
                </p>
              </Card>
              <Card className="border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface)] px-4 py-4 text-xs shadow-none">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
                  3 · Get your report
                </p>
                <p className="mt-1.5 text-[color:var(--pm-text-main)]">
                  In under a minute, see top fixes and a practice plan you can
                  act on today.
                </p>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--pm-text-muted)]">
              Built for real practice
            </p>
            <Card className="px-4 py-4 text-xs shadow-none">
              <ul className="space-y-1.5 text-[color:var(--pm-text-muted)]">
                <li>
                  Transcript-aware analysis: we combine transcript and light
                  metrics before calling Amazon Nova.
                </li>
                <li>
                  Deterministic baseline: consistent preprocessing keeps results
                  repeatable.
                </li>
                <li>
                  Structured outputs: a strict JSON schema powers the studio
                  report view.
                </li>
              </ul>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

