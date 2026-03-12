## Frontend

The PitchMirror frontend is a Next.js app that provides:

- A polished **landing page** at `/`.
- A **studio experience** at `/studio` that connects to the real backend API and renders the premium coaching report UI.

It is in a **polish/freeze** state aligned with the current backend and worker implementation.

---

### Tech stack

- **Framework**: Next.js (App Router).
- **Language**: TypeScript + React.
- **Styling**:
  - Tailwind CSS.
  - shadcn‑inspired UI primitives (e.g., `Button`, `Card`, `StudioLayout`).

The frontend talks to the backend via helper functions in `frontend/src/app/lib/api` (client‑side wrappers over the HTTP endpoints).

---

### Routes

#### `/` – Landing page

Implementation: `frontend/src/app/page.tsx`.

Purpose:

- Explain what PitchMirror is.
- Show the three coaching modes at a glance.
- Provide primary CTAs into the studio (`/studio`) and to see how the product works.

Content highlights:

- **Hero section**:
  - Messaging: practice pitch video → focused coaching report (voice, presence, structure).
  - “Open the studio” CTA button linking to `/studio`.
- **“How it works”** section:
  - Three steps: upload, choose mode, get focused coaching report.
- **Coaching modes** section:
  - Audio coaching, Camera coaching, Full pitch review – explained in product language.
- **Why PitchMirror** section:
  - Deterministic baseline.
  - Amazon Nova enhancement.
  - Transcript‑aware analysis.
  - Practical feedback with a practice plan.
- **Final CTA**:
  - Encourages users to open the studio and start practicing.

#### `/studio` – Studio page

Implementation: `frontend/src/app/studio/page.tsx`.

Purpose:

- Guide the user through:
  - Selecting a coaching mode and tier.
  - Uploading a single video file.
  - (Optionally) pasting transcript text.
  - Starting the analysis.
  - Watching status transitions.
  - Viewing the completed report.

Key UI components:

- `StudioLayout` – two‑column layout (wizard panel + right panel).
- `StudioModeSelector` – mode selection (Audio, Camera, Full).
- `StudioUploadCard` – file input for the video (video‑only).
- `StudioTranscriptCard` – optional transcript text area.
- `StudioAnalysisSummaryCard` – summary of current selection, consent checkbox, and “Start analysis” button.
- `StudioRightPanel` – displays progress, status, errors, and the final report.
- `ProgressView` – visual representation of progress phases.

---

### UX state model

Internally, the studio uses a `phase` state (derived from `ProgressPhase`) and the backend job status to drive the UI.

- **Local phases (frontend)**:
  - `"idle"` – no active analysis, waiting for user input.
  - `"creating"` – creating a job via `POST /jobs`.
  - `"uploading"` – uploading the video to the presigned URL.
  - `"finalizing"` – calling `POST /jobs/:jobId/finalize`.
  - `"polling"` – polling `GET /jobs/:jobId` until the job completes.
  - `"reportLoading"` – fetching the final report via `GET /jobs/:jobId/report`.
  - `"report"` – displaying the completed report.

- **Mapped user‑visible states**:
  - **Ready**:
    - Phase: `"idle"`.
    - UI: file picker, mode selector, and consent checkbox available.
  - **Uploading**:
    - Phase: `"creating"` → `"uploading"`.
    - UI: indicates that the video is being uploaded; controls are disabled.
  - **Processing**:
    - Phase: `"finalizing"` → `"polling"` → `"reportLoading"`.
    - Backed by backend job statuses like `"UPLOADED"`, `"RUNNING"`, intermediate stages.
  - **Complete**:
    - Phase: `"report"`.
    - Job status: `"SUCCEEDED"`.
    - UI: premium report UI rendered with sections, top fixes, and practice plan.
  - **Failed**:
    - If the job status reaches `"FAILED"` or the frontend encounters a terminal API error.
    - UI: shows error details and returns to an idle‑like state where the user can retry.

The studio also supports **resuming** an existing job by ID, using `GET /jobs/:jobId` and `GET /jobs/:jobId/report`.

---

### Backend‑connected flow

The studio’s “Start analysis” button triggers the real backend sequence:

1. **Validation in the browser**
   - Ensures a file is selected and has a MIME type.
   - Ensures consent is checked.
2. **Create job**
   - Calls `createJob({ mode, tier, consent: true, contentType })`.
   - Stores `jobId` and `rawKey` locally.
3. **Upload video**
   - Calls `uploadToPresignedUrl` with:
     - `url`: from `created.upload.url`.
     - `file`: the selected video file.
     - `contentType`: `created.upload.requiredHeaders["content-type"]`.
4. **Optional transcript**
   - If transcript text is non‑empty, calls `uploadTranscript(jobId, { transcriptText })`.
   - This attaches `transcript.json` (and optionally `subtitles.vtt`) to the job in the derived bucket.
5. **Finalize job**
   - Calls `finalizeJob({ jobId, rawKey })`.
   - Records `requestId` and `pipelineStart` in local state for debugging.
   - If `pipelineStart === "failed"`, surfaces error details and stops.
6. **Poll job status**
   - Starts polling `getJobStatus(jobId)` every 1.5–3 seconds.
   - If `status === "SUCCEEDED"`:
     - Switches to `"reportLoading"` and calls `getReport(jobId)` with retry logic for transient `409 REPORT_NOT_READY`.
   - If `status === "FAILED"`:
     - Stops polling and returns to idle with an error message.
7. **Render report**
   - On success, stores the `Report` object and enters `"report"` phase.
   - `StudioRightPanel` renders the premium report UI using:
     - `overall`, `top_fixes`.
     - `voice`, `presence`, `content`.
     - `practice_plan`, `limitations`.
     - Metadata such as `analysis_mode`, `ai_used`, `transcript_used` when present.

The frontend does **not** invent fields; it displays exactly what the backend’s `Report` type defines.

---

### Coaching modes (frontend perspective)

The frontend exposes product‑level coaching modes that map directly to backend modes:

- **Audio coaching** → backend mode `voice`
  - Emphasizes vocal delivery and pacing.
  - Still requires a video upload; the worker uses the video’s audio track.
  - Transcript is optional but strongly improves content‑level feedback when present.

- **Camera coaching** → backend mode `presence`
  - Emphasizes on‑camera presence and body language.
  - Relies on keyframes and visual cues.
  - Transcript is optional; the flow works without it.

- **Full pitch review** → backend mode `full`
  - Combines voice, presence, and content structure.
  - With transcript:
    - Worker can ground content feedback in the actual words.
  - Without transcript:
    - Worker still runs but may rely more on heuristics and frames.

The studio UI uses clear, non‑technical language (Audio coaching, Camera coaching, Full pitch review) while the underlying API uses the `voice` / `presence` / `full` mode strings.

---

### Report rendering

The premium report UI in the studio surfaces:

- **Overall score and summary**.
- **Top fixes**:
  - At least three focused, actionable issues with “why” and “drill” fields.
- **Section views**:
  - Voice, presence, content – each with optional score, highlights, improvements, and notes.
- **Practice plan**:
  - A short sequence of sessions with time estimates and steps.
- **Limitations**:
  - A small list of caveats that set expectations about the analysis.

When available, it may also display:

- `analysis_mode`: `"standard"`, `"ai"`, or `"hybrid"`.
- `ai_used`: boolean.
- `transcript_used`: boolean.

These fields communicate whether the output came purely from the deterministic baseline or whether Nova contributed to the final report.

---

### Manual test flows

For frontend‑led validation:

- **Presence AI demo**:
  - Open `/studio`.
  - Choose Camera coaching (presence mode).
  - Upload a short practice video.
  - Leave transcript blank.
  - Start analysis and wait for the report.

- **Voice + transcript demo**:
  - Open `/studio`.
  - Choose Audio coaching (voice mode).
  - Upload a short practice video.
  - Paste a short transcript into the transcript field.
  - Start analysis and wait for the report.

In both flows, the studio should:

- Show clear state transitions (Ready → Uploading → Processing → Complete).
- Render a coherent report consistent with the backend’s `report.json`.

For deeper, backend‑centric smoke testing, see `testing.md` and `SMOKE_TEST.md`.

