import { useRef, useState } from "react";
import type { Mode, Tier } from "../lib/api";

const ACCEPTED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type SupportedContentType = (typeof ACCEPTED_TYPES)[number];

export interface WizardFormState {
  file: File | null;
  mode: Mode;
  tier: Tier;
  consent: boolean;
  transcriptText?: string;
  pitchGoal?: string;
}

interface WizardFormProps {
  state: WizardFormState;
  onChange(next: WizardFormState): void;
  onAnalyze(): void;
  busy: boolean;
  errorText?: string | null;
}

export function WizardForm({
  state,
  onChange,
  onAnalyze,
  busy,
  errorText,
}: WizardFormProps) {
  const canAnalyze =
    !!state.file &&
    state.consent &&
    !busy &&
    state.file.type !== "" &&
    ACCEPTED_TYPES.includes(state.file.type as SupportedContentType);

  function update<K extends keyof WizardFormState>(
    key: K,
    value: WizardFormState[K]
  ) {
    onChange({ ...state, [key]: value });
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && ACCEPTED_TYPES.includes(file.type as SupportedContentType)) {
      update("file", file);
    } else if (file) {
      update("file", file);
    } else {
      update("file", null);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) update("file", file);
  }

  return (
    <div className="card p-5 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-50">
          PitchMirror
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Upload a short pitch video and get clear, actionable coaching feedback.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="space-y-3 md:col-span-2">
          <div>
            <label className="label">Pitch video</label>
            <div
              role="button"
              tabIndex={0}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !busy && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !busy) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`mt-1 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${
                dragActive
                  ? "border-brand bg-brand/10"
                  : state.file
                    ? "border-slate-600 bg-slate-900/60"
                    : "border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60"
              } ${busy ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={handleFileChange}
                disabled={busy}
              />
              {state.file ? (
                <p className="text-sm font-medium text-slate-100">
                  {state.file.name}
                </p>
              ) : (
                <p className="text-sm text-slate-300">
                  Drag and drop your video here, or{" "}
                  <span className="text-brand font-medium">choose a file</span>
                </p>
              )}
              <p className="mt-1 text-[11px] text-slate-500">
                MP4, WebM, MOV
              </p>
            </div>
            {state.file && !ACCEPTED_TYPES.includes(
              state.file.type as SupportedContentType
            ) && (
              <p className="mt-1 text-[11px] text-red-300">
                Selected file type is not supported. Please use MP4, WebM, or MOV.
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="label">Feedback type</label>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <ModeOption
                  label="Quick Feedback"
                  value="full"
                  description="Combined coaching on voice, presence, and content"
                  selected={state.mode === "full"}
                  onSelect={() => update("mode", "full")}
                  disabled={busy}
                />
                <ModeOption
                  label="Voice & Delivery"
                  value="voice"
                  description="Pacing, pauses, and filler words"
                  selected={state.mode === "voice"}
                  onSelect={() => update("mode", "voice")}
                  disabled={busy}
                />
                <ModeOption
                  label="On-Camera Presence"
                  value="presence"
                  description="Posture, gaze, and expressiveness"
                  selected={state.mode === "presence"}
                  onSelect={() => update("mode", "presence")}
                  disabled={busy}
                />
              </div>
            </div>

            <div>
              <label className="label">Video length</label>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <TierOption
                  label="Short"
                  value="free"
                  description="Up to 45 seconds"
                  selected={state.tier === "free"}
                  onSelect={() => update("tier", "free")}
                  disabled={busy}
                />
                <TierOption
                  label="Medium"
                  value="pro"
                  description="Up to 2 minutes"
                  selected={state.tier === "pro"}
                  onSelect={() => update("tier", "pro")}
                  disabled={busy}
                />
                <TierOption
                  label="Long"
                  value="max"
                  description="Up to 5 minutes"
                  selected={state.tier === "max"}
                  onSelect={() => update("tier", "max")}
                  disabled={busy}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Your video is used only to generate feedback and is deleted automatically after a short time.
          </p>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
            <div className="flex items-start gap-2">
              <input
                id="consent"
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-brand focus:ring-brand"
                checked={state.consent}
                onChange={(e) => update("consent", e.target.checked)}
                disabled={busy}
              />
              <label htmlFor="consent" className="text-xs text-slate-200">
                I agree to upload this video for analysis.
              </label>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary w-full flex items-center justify-center gap-2"
            onClick={onAnalyze}
            disabled={!canAnalyze}
          >
            {busy ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                Analyzing…
              </>
            ) : (
              "Analyze my pitch"
            )}
          </button>
          {errorText && (
            <p className="text-[11px] text-red-300">
              {errorText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface ModeOptionProps {
  label: string;
  value: Mode;
  description: string;
  selected: boolean;
  onSelect(): void;
  disabled: boolean;
}

function ModeOption({
  label,
  description,
  selected,
  onSelect,
  disabled,
}: ModeOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`rounded-lg border px-2 py-2 text-left transition-colors ${
        selected
          ? "border-brand bg-brand/20 text-slate-50"
          : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">{description}</p>
    </button>
  );
}

interface TierOptionProps {
  label: string;
  value: Tier;
  description: string;
  selected: boolean;
  onSelect(): void;
  disabled: boolean;
}

function TierOption({
  label,
  description,
  selected,
  onSelect,
  disabled,
}: TierOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`rounded-lg border px-2 py-2 text-left transition-colors ${
        selected
          ? "border-brand bg-brand/20 text-slate-50"
          : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-600"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">{description}</p>
    </button>
  );
}

