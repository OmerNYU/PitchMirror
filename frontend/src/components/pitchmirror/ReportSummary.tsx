import type { Report } from "../../lib/api";
import { Card } from "../ui/card";

interface ReportSummaryProps {
  report: Report | null;
  artifactsFromJob: Record<string, unknown> | null;
}

export function ReportSummary({ report }: ReportSummaryProps) {
  if (!report) {
    return (
      <>
        <Card className="px-4 py-4 md:px-5 md:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
            What you&apos;ll get
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)]">
            A concise coaching summary
          </h2>
          <ul className="mt-3 space-y-1.5 text-xs text-[color:var(--pm-text-muted)]">
            <li>1–2 paragraphs on how your pitch comes across overall.</li>
            <li>Specific notes on voice, on-camera presence, and structure.</li>
            <li>3 targeted suggestions to improve your next recording.</li>
          </ul>
        </Card>

        <Card tone="soft" className="px-4 py-4 md:px-5 md:py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
            What we look at &amp; how we handle your video
          </p>
          <div className="mt-2 space-y-3 text-xs text-[color:var(--pm-text-muted)]">
            <div>
              <p className="font-medium text-[color:var(--pm-text-main)]">
                Coaching focus
              </p>
              <ul className="mt-1.5 space-y-1.5">
                <li>
                  <span className="font-medium text-[color:var(--pm-text-main)]">
                    Voice
                  </span>{" "}
                  – pacing, tone, pauses, and filler words.
                </li>
                <li>
                  <span className="font-medium text-[color:var(--pm-text-main)]">
                    Presence
                  </span>{" "}
                  – posture, eye contact, and energy on camera.
                </li>
                <li>
                  <span className="font-medium text-[color:var(--pm-text-main)]">
                    Content
                  </span>{" "}
                  – clarity of message and narrative flow.
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-[color:var(--pm-text-main)]">
                Constraints &amp; retention
              </p>
              <ul className="mt-1.5 space-y-1.5">
                <li>Max length: 5 minutes. Max size: 500 MB.</li>
                <li>Supported formats: MP4, MOV, WebM.</li>
                <li>Analysis usually completes within 30–60 seconds.</li>
                <li>Videos are deleted automatically after processing.</li>
              </ul>
            </div>
          </div>
        </Card>
      </>
    );
  }

  const topFixes = Array.isArray(report.top_fixes)
    ? report.top_fixes.slice(0, 3)
    : [];

  const hasTopFixes = topFixes.length > 0;

  return (
    <>
      <Card className="px-4 py-4 md:px-5 md:py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
          Summary
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[color:var(--pm-text-main)]">
          {report.overall?.summary ?? "Coaching summary ready."}
        </h2>
        {typeof report.overall?.score === "number" && (
          <p className="mt-3 text-xs text-[color:var(--pm-text-muted)]">
            Overall score:{" "}
            <span className="font-semibold text-[color:var(--pm-accent)]">
              {Math.round(report.overall.score)}
            </span>
          </p>
        )}
        {report.generatedAt && (
          <p className="mt-1 text-[11px] text-[color:var(--pm-text-muted)]">
            Generated at {new Date(report.generatedAt).toLocaleString()}
          </p>
        )}
      </Card>

      <Card tone="soft" className="px-4 py-4 md:px-5 md:py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
          What to improve next
        </p>
        {hasTopFixes ? (
          <ul className="mt-2 space-y-2 text-xs text-[color:var(--pm-text-muted)]">
            {topFixes.map((fix, index) => (
              <li
                key={index}
                className="rounded-2xl bg-[color:var(--pm-surface-soft)] px-3 py-2"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--pm-text-muted)]">
                  Focus {index + 1}
                </p>
                <p className="mt-1 text-xs text-[color:var(--pm-text-main)]">
                  {fix.issue}
                </p>
                {fix.why && (
                  <p className="mt-0.5 text-[11px] text-[color:var(--pm-text-muted)]">
                    {fix.why}
                  </p>
                )}
                {fix.drill && (
                  <p className="mt-1 text-[11px] text-[color:var(--pm-accent)]">
                    Suggested drill: {fix.drill}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[color:var(--pm-text-muted)]">
            No specific next steps were provided. Focus on recording a clear,
            confident take and keep your pitch under five minutes.
          </p>
        )}
      </Card>

      <Card tone="soft" className="px-4 py-4 md:px-5 md:py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
          Constraints &amp; deletion
        </p>
        <ul className="mt-2 space-y-1.5 text-xs text-[color:var(--pm-text-muted)]">
          <li>Max length: 5 minutes. Max size: 500 MB.</li>
          <li>Formats: MP4, MOV, WebM only.</li>
          <li>Analysis typically completes within 30–60 seconds.</li>
          <li>Videos are deleted automatically after processing.</li>
        </ul>
      </Card>
    </>
  );
}

