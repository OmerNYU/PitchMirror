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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    update("file", file);
  }

  return (
    <div className="card p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">
            PitchMirror Analysis
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Upload a short pitch video and choose your coaching mode. We&apos;ll
            handle the preprocessing and send Nova only a compact evidence pack.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-[11px] text-emerald-100 max-w-xs">
          <p className="font-semibold uppercase tracking-wide">
            Security & Cost
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Video goes to S3 only, never directly to Nova.</li>
            <li>No client-side parsing beyond what is rendered here.</li>
            <li>Artifacts derived strictly from jobId.</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="space-y-3 md:col-span-2">
          <div>
            <label className="label">Pitch video</label>
            <input
              type="file"
              className="input mt-1 cursor-pointer bg-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-100 hover:file:bg-slate-700"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileChange}
              disabled={busy}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Supported: MP4, WebM, QuickTime. Tier caps: Free 45s, Pro 2m, Max
              5m (enforced server-side).
            </p>
            {state.file && !ACCEPTED_TYPES.includes(
              state.file.type as SupportedContentType
            ) && (
              <p className="mt-1 text-[11px] text-red-300">
                Selected file type {state.file.type || "unknown"} is not
                supported.
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="label">Coaching mode</label>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <ModeOption
                  label="Voice"
                  value="voice"
                  description="Pacing, pauses, filler words"
                  selected={state.mode === "voice"}
                  onSelect={() => update("mode", "voice")}
                  disabled={busy}
                />
                <ModeOption
                  label="Presence"
                  value="presence"
                  description="Posture, gaze, expressiveness"
                  selected={state.mode === "presence"}
                  onSelect={() => update("mode", "presence")}
                  disabled={busy}
                />
                <ModeOption
                  label="Full"
                  value="full"
                  description="Combined, prioritized coaching"
                  selected={state.mode === "full"}
                  onSelect={() => update("mode", "full")}
                  disabled={busy}
                />
              </div>
            </div>

            <div>
              <label className="label">Tier</label>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <TierOption
                  label="Free"
                  value="free"
                  description="Up to ~45s"
                  selected={state.tier === "free"}
                  onSelect={() => update("tier", "free")}
                  disabled={busy}
                />
                <TierOption
                  label="Pro"
                  value="pro"
                  description="Up to ~2m"
                  selected={state.tier === "pro"}
                  onSelect={() => update("tier", "pro")}
                  disabled={busy}
                />
                <TierOption
                  label="Max"
                  value="max"
                  description="Up to ~5m"
                  selected={state.tier === "max"}
                  onSelect={() => update("tier", "max")}
                  disabled={busy}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
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
                I understand that my video will be uploaded to PitchMirror&apos;s
                S3 bucket for processing, and that Nova will only see derived
                evidence (transcript, metrics, keyframes).
              </label>
            </div>
            {!state.consent && (
              <p className="mt-2 text-[11px] text-slate-500">
                Consent is required to start the analysis.
              </p>
            )}
          </div>

          <button
            type="button"
            className="btn-primary w-full"
            onClick={onAnalyze}
            disabled={!canAnalyze}
          >
            {busy ? "Working…" : "Analyze"}
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

