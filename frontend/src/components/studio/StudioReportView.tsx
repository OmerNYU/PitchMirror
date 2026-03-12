"use client";

import { useState } from "react";
import type { Mode, Report, ReportSection } from "../../lib/api";
import { Card } from "../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { cn } from "@/lib/utils";

const KNOWN_SECTION_KEYS = new Set([
  "score",
  "highlights",
  "improvements",
  "notes",
]);

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : String(v)))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value];
  }
  return [];
}

function sectionDisplayData(
  section: ReportSection | undefined
): {
  score?: number;
  highlights: string[];
  improvements: string[];
  notes: string;
  extra: { label: string; value: string | string[] }[];
} {
  if (!section || typeof section !== "object") {
    return {
      highlights: [],
      improvements: [],
      notes: "",
      extra: [],
    };
  }
  const s = section as Record<string, unknown>;
  const highlights = asStringList(s.highlights);
  const improvements = asStringList(s.improvements);
  const notes =
    typeof s.notes === "string" && s.notes.trim() ? s.notes : "";
  const score =
    typeof s.score === "number" && Number.isFinite(s.score) ? s.score : undefined;

  const extra: { label: string; value: string | string[] }[] = [];
  for (const [key, value] of Object.entries(s)) {
    if (KNOWN_SECTION_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "string" && value.trim()) {
      extra.push({
        label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: value,
      });
    } else if (Array.isArray(value)) {
      const arr = asStringList(value);
      if (arr.length)
        extra.push({
          label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          value: arr,
        });
    }
  }

  return {
    score,
    highlights,
    improvements,
    notes,
    extra,
  };
}

function SectionTabContent({
  section,
  emptyMessage = "No feedback for this section.",
}: {
  section: ReportSection | undefined;
  emptyMessage?: string;
}) {
  const data = sectionDisplayData(section);
  const hasAny =
    data.score !== undefined ||
    data.highlights.length > 0 ||
    data.improvements.length > 0 ||
    data.notes.length > 0 ||
    data.extra.length > 0;

  if (!hasAny) {
    return (
      <p className="text-xs text-[color:var(--pm-text-muted)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      {data.score !== undefined && (
        <p className="text-[color:var(--pm-text-muted)]">
          Score:{" "}
          <span className="font-semibold text-[color:var(--pm-text-main)]">
            {Math.round(data.score)}
          </span>
        </p>
      )}
      {data.highlights.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--pm-text-muted)]">
            Highlights
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[color:var(--pm-text-main)]">
            {data.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}
      {data.improvements.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--pm-text-muted)]">
            Improvements
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[color:var(--pm-text-main)]">
            {data.improvements.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}
      {data.notes && (
        <p className="text-[color:var(--pm-text-main)] whitespace-pre-wrap">
          {data.notes}
        </p>
      )}
      {data.extra.map(({ label, value }, i) => (
        <div key={i}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--pm-text-muted)]">
            {label}
          </p>
          <div className="mt-1.5 text-[color:var(--pm-text-main)]">
            {Array.isArray(value) ? (
              <ul className="list-disc space-y-1 pl-4">
                {value.map((v, j) => (
                  <li key={j}>{v}</li>
                ))}
              </ul>
            ) : (
              <p className="whitespace-pre-wrap">{value}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface StudioReportViewProps {
  report: Report;
  artifactsFromJob?: Record<string, unknown> | null;
  mode?: Mode | null;
}

export function StudioReportView({
  report,
  artifactsFromJob,
  mode,
}: StudioReportViewProps) {
  console.log("[studio] report render entry", { mode });
  const [technicalOpen, setTechnicalOpen] = useState(false);

  const topFixes = Array.isArray(report.top_fixes) ? report.top_fixes : [];
  const practicePlan = Array.isArray(report.practice_plan)
    ? report.practice_plan
    : [];
  const limitations = Array.isArray(report.limitations) ? report.limitations : [];
  const limitationsText = limitations.join(" ").toLowerCase();
  const mentionsNoAudio = limitationsText.includes("no audio");

  const isPresenceMode = mode === "presence";
  const defaultTab = isPresenceMode ? "presence" : "voice";
  const hasArtifacts =
    (report.artifacts && Object.keys(report.artifacts).length > 0) ||
    (artifactsFromJob && Object.keys(artifactsFromJob).length > 0);

  const meta: { label: string; value: string }[] = [];
  if (report.analysis_mode != null) {
    const analysisModeStr = String(report.analysis_mode ?? "");
    meta.push({
      label: "Analysis mode",
      value:
        analysisModeStr.charAt(0).toUpperCase() + analysisModeStr.slice(1),
    });
  }
  if (report.ai_used != null) {
    meta.push({ label: "AI used", value: report.ai_used ? "Yes" : "No" });
  }
  if (report.transcript_used != null) {
    meta.push({
      label: "Transcript used",
      value: report.transcript_used ? "Yes" : "No",
    });
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* A. Metadata bar */}
      {meta.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[color:var(--pm-text-muted)]"
          aria-label="Report metadata"
        >
          {meta.map(({ label, value }, i) => (
            <span key={i}>
              {label}: {value}
            </span>
          ))}
        </div>
      )}

      {/* B. Overall summary card */}
      <Card className="px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
          Overall
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-lg md:text-xl font-semibold leading-snug text-[color:var(--pm-text-main)]">
          {report.overall?.summary ?? "Coaching summary ready."}
        </p>
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
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        )}
      </Card>

      {/* C. Top fixes */}
      {topFixes.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
            Top opportunities
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topFixes.map((fix, idx) => (
              <li
                key={idx}
                className="rounded-2xl border border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface-soft)]/50 px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--pm-text-muted)]">
                  Fix {idx + 1}
                </p>
                <p className="mt-1.5 text-sm font-medium text-[color:var(--pm-text-main)]">
                  {fix.issue}
                </p>
                {fix.why && (
                  <p className="mt-1 text-xs text-[color:var(--pm-text-muted)]">
                    {fix.why}
                  </p>
                )}
                {fix.drill && (
                  <p className="mt-2 text-[11px] text-[color:var(--pm-accent)]">
                    Drill: {fix.drill}
                  </p>
                )}
                {fix.expected_gain && (
                  <p className="mt-1 text-[11px] text-[color:var(--pm-text-muted)]">
                    Impact: {fix.expected_gain}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* D. Voice / Presence / Content tabs */}
      <Card className="overflow-hidden px-5 py-5">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList
            variant="line"
            className="w-full justify-start rounded-none border-b border-[color:var(--pm-border-subtle)]/70 bg-transparent p-0"
          >
            <TabsTrigger
              value="voice"
              className={cn(
                "rounded-none border-b-2 border-transparent data-active:border-[color:var(--pm-accent)] data-active:text-[color:var(--pm-text-main)]",
                "text-[color:var(--pm-text-muted)] hover:text-[color:var(--pm-text-main)]"
              )}
            >
              Voice
            </TabsTrigger>
            <TabsTrigger
              value="presence"
              className={cn(
                "rounded-none border-b-2 border-transparent data-active:border-[color:var(--pm-accent)] data-active:text-[color:var(--pm-text-main)]",
                "text-[color:var(--pm-text-muted)] hover:text-[color:var(--pm-text-main)]"
              )}
            >
              Presence
            </TabsTrigger>
            <TabsTrigger
              value="content"
              className={cn(
                "rounded-none border-b-2 border-transparent data-active:border-[color:var(--pm-accent)] data-active:text-[color:var(--pm-text-main)]",
                "text-[color:var(--pm-text-muted)] hover:text-[color:var(--pm-text-main)]"
              )}
            >
              Content
            </TabsTrigger>
          </TabsList>
          <div className="pt-4">
            <TabsContent value="voice">
              {isPresenceMode || mentionsNoAudio ? (
                <p className="text-xs text-[color:var(--pm-text-muted)]">
                  No audio was available for this analysis. This run focused on how you
                  come across on camera.
                </p>
              ) : (
                <SectionTabContent section={report.voice} />
              )}
            </TabsContent>
            <TabsContent value="presence">
              <SectionTabContent section={report.presence} />
            </TabsContent>
            <TabsContent value="content">
              <SectionTabContent section={report.content} />
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* E. Practice plan */}
      <Card tone="soft" className="px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
          Practice plan
        </p>
        {practicePlan.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {practicePlan.map((session, idx) => (
              <li
                key={idx}
                className="rounded-2xl border border-[color:var(--pm-border-subtle)]/60 bg-[color:var(--pm-surface)]/60 px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--pm-text-muted)]">
                  Session {session.session} · {session.minutes} min
                </p>
                <p className="mt-1.5 text-sm font-medium text-[color:var(--pm-text-main)]">
                  Focus: {session.focus}
                </p>
                {session.steps?.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[color:var(--pm-text-muted)]">
                    {session.steps.map((step, stepIdx) => (
                      <li key={stepIdx}>{step}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[color:var(--pm-text-muted)]">
            No practice plan provided.
          </p>
        )}
      </Card>

      {/* F. Limitations and note */}
      <Card tone="soft" className="px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)]">
          Limitations &amp; note
        </p>
        {limitations.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[color:var(--pm-text-main)]">
            {limitations.map((limitation, idx) => (
              <li key={idx}>{limitation}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-[color:var(--pm-text-muted)]">
            No limitations recorded.
          </p>
        )}
        {report.note?.trim() && (
          <p className="mt-3 text-xs text-[color:var(--pm-text-muted)] whitespace-pre-wrap border-t border-[color:var(--pm-border-subtle)]/60 pt-3">
            Note: {report.note}
          </p>
        )}
      </Card>

      {/* G. Optional technical details */}
      {hasArtifacts && (
        <div className="rounded-2xl border border-[color:var(--pm-border-subtle)]/60 bg-[color:var(--pm-surface-soft)]/30 px-4 py-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--pm-text-muted)] hover:text-[color:var(--pm-text-main)]"
            onClick={() => setTechnicalOpen((o) => !o)}
            aria-expanded={technicalOpen}
          >
            Technical details
            <span aria-hidden>{technicalOpen ? "−" : "+"}</span>
          </button>
          {technicalOpen && (
            <div className="mt-3 space-y-2">
              {report.artifacts && (
                <pre className="overflow-x-auto rounded-xl bg-[color:var(--pm-surface)]/80 p-3 font-mono text-[11px] text-[color:var(--pm-text-muted)]">
                  {JSON.stringify(report.artifacts, null, 2)}
                </pre>
              )}
              {artifactsFromJob && (
                <pre className="overflow-x-auto rounded-xl bg-[color:var(--pm-surface)]/80 p-3 font-mono text-[11px] text-[color:var(--pm-text-muted)]">
                  {JSON.stringify(artifactsFromJob, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
