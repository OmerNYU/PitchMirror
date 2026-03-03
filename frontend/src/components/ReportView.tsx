import type { Report } from "../lib/api";

interface ReportViewProps {
  report?: Report | null;
  artifactsFromJob?: Record<string, unknown> | null;
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .slice(0, 4);
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
}

function sectionHighlights(
  section: Record<string, unknown> | undefined
): { highlights: string[]; improvements: string[] } {
  if (!section) return { highlights: [], improvements: [] };

  // Prefer explicit arrays if present
  const highlights = asList((section as any).highlights);
  const improvements = asList((section as any).improvements);
  if (highlights.length || improvements.length) {
    return {
      highlights: highlights.slice(0, 2),
      improvements: improvements.slice(0, 2),
    };
  }

  // Next, prefer a notes field if present (SectionSchema alignment)
  const notesValue = (section as any).notes;
  if (typeof notesValue === "string" && notesValue.trim().length > 0) {
    return {
      highlights: [notesValue],
      improvements: [],
    };
  }

  // Fallback: pick a couple of known/textual fields just for display
  const entries = Object.entries(section).filter(
    ([key, value]) =>
      typeof value === "string" &&
      !["highlights", "improvements", "notes"].includes(key.toLowerCase())
  );

  const texts = entries.map(([, value]) => String(value)).slice(0, 4);

  return {
    highlights: texts.slice(0, 2),
    improvements: texts.slice(2, 4),
  };
}

export function ReportView({ report, artifactsFromJob }: ReportViewProps) {
  if (!report) return null;

  const voice = sectionHighlights(report.voice as Record<string, unknown>);
  const presence = sectionHighlights(
    report.presence as Record<string, unknown>
  );
  const content = sectionHighlights(report.content as Record<string, unknown>);

  return (
    <div className="mt-6 space-y-6">
      <section className="card p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Overall
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-50">
              {report.overall.summary}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400">Score</span>
            <span className="mt-1 text-3xl font-semibold text-emerald-400">
              {Math.round(report.overall.score)}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Top opportunities
          </p>
          <ul className="mt-2 grid gap-3 md:grid-cols-3 text-xs">
            {report.top_fixes.slice(0, 3).map((fix, idx) => (
              <li
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Fix {idx + 1}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-50">
                  {fix.issue}
                </p>
                <p className="mt-1 text-xs text-slate-300">{fix.why}</p>
                <p className="mt-2 text-[11px] text-emerald-300">
                  Drill: {fix.drill}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Impact: {fix.expected_gain}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <CoachSection
          title="Voice"
          highlights={voice.highlights}
          improvements={voice.improvements}
        />
        <CoachSection
          title="Presence"
          highlights={presence.highlights}
          improvements={presence.improvements}
        />
        <CoachSection
          title="Content"
          highlights={content.highlights}
          improvements={content.improvements}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-4 text-xs text-slate-200 md:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Practice plan
          </p>
          {report.practice_plan.length ? (
            <ul className="mt-2 space-y-2">
              {report.practice_plan.map((session, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Session {session.session} · {session.minutes} min
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-50">
                    Focus: {session.focus}
                  </p>
                  {session.steps.length > 0 && (
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-200">
                      {session.steps.map((step, stepIdx) => (
                        <li key={stepIdx}>{step}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              No practice plan provided.
            </p>
          )}
        </div>

        <div className="card p-4 text-xs text-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Limitations
          </p>
          {report.limitations.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {report.limitations.map((limitation, idx) => (
                <li key={idx}>{limitation}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              No limitations were recorded.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-4 text-xs text-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Artifacts
          </p>
          <div className="mt-2 space-y-1">
            {report.artifacts && (
              <pre className="overflow-x-auto rounded-lg bg-slate-950/60 p-2 font-mono text-[11px] text-slate-200">
                {JSON.stringify(report.artifacts, null, 2)}
              </pre>
            )}
            {artifactsFromJob && (
              <pre className="overflow-x-auto rounded-lg bg-slate-950/60 p-2 font-mono text-[11px] text-slate-200">
                {JSON.stringify(artifactsFromJob, null, 2)}
              </pre>
            )}
            {!report.artifacts && !artifactsFromJob && (
              <p className="text-slate-400">
                Artifacts will appear here when available.
              </p>
            )}
          </div>
        </div>

        <div className="card p-4 text-xs text-slate-200 md:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-slate-200">
            {report.note ?? "No additional notes."}
          </p>
        </div>
      </section>
    </div>
  );
}

interface CoachSectionProps {
  title: string;
  highlights: string[];
  improvements: string[];
}

function CoachSection({ title, highlights, improvements }: CoachSectionProps) {
  return (
    <div className="card p-4 text-xs text-slate-200">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <div className="mt-2 space-y-2">
        <div>
          <p className="font-semibold text-slate-100">Highlights</p>
          {highlights.length ? (
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {highlights.map((h, idx) => (
                <li key={idx}>{h}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-slate-500">No highlights captured.</p>
          )}
        </div>
        <div>
          <p className="font-semibold text-slate-100">Improvements</p>
          {improvements.length ? (
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {improvements.map((h, idx) => (
                <li key={idx}>{h}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-slate-500">No improvements captured.</p>
          )}
        </div>
      </div>
    </div>
  );
}

