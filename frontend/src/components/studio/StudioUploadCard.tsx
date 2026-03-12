"use client";

import { useState } from "react";
import type { Mode } from "../../lib/api";
import { Card } from "../ui/card";
import { UploadCloud, Mic, Video } from "lucide-react";

const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

const ACCEPTED_TYPES_STRING = ACCEPTED_VIDEO_TYPES.join(",");

interface StudioUploadCardProps {
  mode: Mode;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  error?: string | null;
}

function uploadCopy(mode: Mode): {
  title: string;
  hint: string;
  dropLabel: string;
  dropSub: string;
  formats: string;
  icon: React.ReactNode;
} {
  switch (mode) {
    case "voice":
      return {
        title: "Upload your pitch video",
        hint:
          "We analyze your voice and delivery from the video’s audio track. Upload a video as usual.",
        dropLabel: "Drag a video here",
        dropSub: "…or click to choose a file. We’ll focus on how you sound.",
        formats: "MP4, MOV, WebM · up to 5 min / 500 MB",
        icon: <Mic className="h-6 w-6 text-[color:var(--pm-accent)]" />,
      };
    case "presence":
      return {
        title: "Upload your pitch video",
        hint: "We’ll focus on posture, eye contact, and how you come across on camera.",
        dropLabel: "Drag a video here",
        dropSub: "…or click to choose a file from your computer.",
        formats: "MP4, MOV, WebM · up to 5 min / 500 MB",
        icon: <Video className="h-6 w-6 text-[color:var(--pm-accent)]" />,
      };
    case "full":
      return {
        title: "Upload your pitch video",
        hint: "We’ll look at voice, presence, and content together.",
        dropLabel: "Drag a video here",
        dropSub: "…or click to choose a file from your computer.",
        formats: "MP4, MOV, WebM · up to 5 min / 500 MB",
        icon: <UploadCloud className="h-6 w-6 text-[color:var(--pm-accent)]" />,
      };
  }
}

export function StudioUploadCard({
  mode,
  file,
  onFileChange,
  disabled = false,
  error = null,
}: StudioUploadCardProps) {
  const [dragActive, setDragActive] = useState(false);
  const copy = uploadCopy(mode);

  function handleSelect(f: File | null) {
    if (!f) {
      onFileChange(null);
      return;
    }
    const valid = ACCEPTED_VIDEO_TYPES.includes(
      f.type as (typeof ACCEPTED_VIDEO_TYPES)[number]
    );
    if (valid) {
      onFileChange(f);
    } else {
      onFileChange(null);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f && ACCEPTED_VIDEO_TYPES.includes(f.type as (typeof ACCEPTED_VIDEO_TYPES)[number])) {
      onFileChange(f);
    } else if (f) {
      onFileChange(null);
    }
  }

  const canEdit = !disabled;

  return (
    <Card className="px-5 py-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--pm-border-subtle)] bg-[color:var(--pm-surface-soft)] text-[color:var(--pm-accent)] sm:flex">
          {copy.icon}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-[color:var(--pm-text-main)]">
              {copy.title}
            </h2>
            <p className="mt-1 text-xs text-[color:var(--pm-text-muted)]">
              {copy.hint}
            </p>
          </div>
          <label
            className={[
              "flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm transition-colors",
              dragActive
                ? "border-[color:var(--pm-accent)] bg-[color:var(--pm-accent-soft)]/40"
                : file
                  ? "border-[color:var(--pm-border-subtle)] bg-[color:var(--pm-surface-soft)]/60"
                  : "border-[color:var(--pm-border-subtle)]/70 bg-[color:var(--pm-surface-soft)]/30 hover:border-[color:var(--pm-border-subtle)]",
              !canEdit ? "pointer-events-none opacity-60" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (canEdit) setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(false);
            }}
            onDrop={handleDrop}
          >
            <input
              type="file"
              className="sr-only"
              accept={ACCEPTED_TYPES_STRING}
              onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
              disabled={!canEdit}
            />
            <p className="text-sm font-medium text-[color:var(--pm-text-main)]">
              {file ? file.name : copy.dropLabel}
            </p>
            <p className="mt-0.5 text-[11px] text-[color:var(--pm-text-muted)]">
              {copy.dropSub}
            </p>
            <p className="mt-2 text-[10px] text-[color:var(--pm-text-muted)]">
              {copy.formats}
            </p>
          </label>
          {error && (
            <p className="text-[11px] text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
