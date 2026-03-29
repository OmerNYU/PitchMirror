## PitchMirror

PitchMirror is a multimodal pitch‑coaching web app powered by Amazon Nova. You upload a short practice pitch video and receive a focused coaching report covering **voice**, **on‑camera presence**, and **content structure**, in under a minute.


### What PitchMirror does

- **Upload a practice pitch**: short video clip in a common video format (MP4, WebM, MOV).
- **Choose a coaching mode**:
  - **Audio coaching** (backend mode `voice`): focuses on vocal delivery, pacing, and clarity.
  - **Camera coaching** (backend mode `presence`): focuses on on‑camera presence and body language.
  - **Full pitch review** (backend mode `full`): combines voice, presence, and content structure.
- **Optional transcript**: you can attach your own transcript text (and optional WebVTT subtitles) for more precise content feedback.
- **Get a structured coaching report**: top fixes, drills, a short practice plan, and sections for voice, presence, and content.


### Key features

- **Amazon Nova–powered analysis**: a deterministic heuristic pipeline computes metrics and a baseline report, and Amazon Nova (`amazon.nova-pro-v1:0`) can enhance that report when configured.
- **Deterministic baseline + AI enhancement**:
  - Always produces a schema‑valid baseline report (`report.standard.json`).
  - Writes a final canonical report (`report.json`) that may incorporate AI enhancements.
  - Optionally writes an AI‑only report (`report.ai.json`) for inspection.
- **Transcript‑aware flow**:
  - When a transcript is attached, content feedback can be grounded in the actual words spoken.
  - The worker tracks whether AI and transcript were used (`analysis_mode`, `ai_used`, `transcript_used`).
- **End‑to‑end AWS pipeline**:
  - Jobs table in DynamoDB, raw and derived S3 buckets.
  - Step Functions state machine orchestrating an ECS Fargate worker.
  - Worker writes all artifacts that the backend and frontend consume.
- **Premium report UI**:
  - Studio page surfaces the full coaching report with clear sections, top fixes, and a practice plan.

---

### High‑level architecture

- **Frontend (Next.js)**:
  - Landing page at `/` explaining the product and linking into the studio.
  - Studio experience at `/studio` that manages mode selection, upload, optional transcript, and report viewing.
- **Backend (Fastify + TypeScript)**:
  - Owns the **job lifecycle**, presigned upload URLs, and API surface.
  - Persists state in DynamoDB and coordinates with Step Functions and S3.
- **AWS infrastructure**:
  - **Region**: `us-east-1`.
  - **Raw bucket**: `pitchmirror2-raw-omer-2026`.
  - **Derived bucket**: `pitchmirror2-derived-omer-2026`.
  - **DynamoDB table**: `pitchmirror2-jobs`.
  - **Step Functions state machine**: `arn:aws:states:us-east-1:127214190437:stateMachine:pitchmirror2-stub-pipeline`.
  - **ECS cluster**: `pitchmirror2`, running the worker container from ECR repo `pitchmirror2-worker`.
  - **CloudWatch log group**: `/ecs/pitchmirror2-worker`.
  - Worker uses **Amazon Nova Pro**: `amazon.nova-pro-v1:0`.

For a deeper architectural walkthrough (including the deterministic pipeline, Nova integration, and transcript‑aware behavior), see `docs/architecture.md`.

---

### Current frontend routes

- **`/` – Landing page**
  - Explains what PitchMirror is for and how it works.
  - Highlights the three coaching modes.
  - Calls to action to open the studio.

- **`/studio` – Studio experience**
  - Mode selection: Audio coaching, Camera coaching, Full pitch review.
  - Video upload (single video file per job).
  - Optional transcript text area.
  - Start analysis and track job progress.
  - View the finished coaching report in a premium report UI.

The studio page talks directly to the backend API and reflects real job status and report results.

---

### System flow (end‑to‑end)

1. **User enters the studio** at `/studio`, chooses a mode and tier, and selects a video file.
2. **Frontend calls** `POST /jobs` to create a job and obtain a presigned S3 upload URL.
3. **Frontend uploads the video** directly to the raw S3 bucket using that URL.
4. **Optional transcript**: if provided, the frontend calls `POST /jobs/:jobId/transcript` to store transcript (and optional subtitles) in the derived bucket and record keys on the job.
5. **Frontend calls** `POST /jobs/:jobId/finalize`, which:
   - Verifies size limits and content type in S3.
   - Updates the job to `UPLOADED` / `VALIDATE`.
   - Starts the Step Functions state machine for that job.
6. **Step Functions runs the ECS worker**, which:
   - Downloads the video, runs media analysis, enforces duration caps.
   - Optionally extracts audio and frames.
   - Writes metrics and artifacts to the derived bucket.
   - Builds a deterministic baseline report and, when configured, calls Nova to generate or refine the coaching report.
   - Writes `report.standard.json`, `report.json`, and, when applicable, `report.ai.json` under `derived/<JOB_ID>/`.
7. **Frontend polls** `GET /jobs/:jobId` until the job status is `SUCCEEDED`.
8. **Frontend fetches the final report** via `GET /jobs/:jobId/report` and renders it in the report UI.

The backend enforces that `report.json` is only served when the job is in `SUCCEEDED` state and a report key is present.

---

### Quick start (local development)

#### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your AWS resources:
#   AWS_REGION=us-east-1
#   RAW_BUCKET=pitchmirror2-raw-omer-2026
#   DERIVED_BUCKET=pitchmirror2-derived-omer-2026
#   JOBS_TABLE=pitchmirror2-jobs
#   PITCHMIRROR_SFN_ARN=arn:aws:states:us-east-1:127214190437:stateMachine:pitchmirror2-stub-pipeline
#   ...plus other required settings from .env.example

npm install
npm run dev
```

By default the backend listens on `http://localhost:8080`.

API overview (details in `docs/api.md`):

- `POST /jobs` – create a job and receive a presigned S3 upload URL.
- `POST /jobs/:jobId/finalize` – validate the uploaded object and start the pipeline.
- `GET /jobs/:jobId` – poll job status/stage and metadata.
- `GET /jobs/:jobId/report` – fetch the canonical `report.json` once the job has succeeded.
- `POST /jobs/:jobId/transcript` – attach transcript text (and optional WebVTT).
- `GET /health` – simple health check.

#### 2. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open the app in a browser (typically `http://localhost:3000`), visit `/` and `/studio`, and run through a full analysis flow.

For a detailed smoke test – including `curl` commands and AWS Console verification – see `docs/SMOKE_TEST.md` and `docs/testing.md`.

---

### Documentation map

- **Start here**: this `README.md` for a high‑level overview and quick start.
- **Architecture & design**: `docs/architecture.md`.
- **Backend details** (job lifecycle, env vars, S3/DynamoDB/Step Functions wiring, report behavior): `docs/backend.md`.
- **Frontend details** (routes, UX states, studio flow, report rendering): `docs/frontend.md`.
- **API reference** (request/response shapes for all endpoints): `docs/api.md`.
- **Deployment & infrastructure** (AWS resources and configuration): `docs/deployment.md`.
- **Testing & smoke tests**: `docs/testing.md` and `docs/SMOKE_TEST.md`.
- **Troubleshooting** (common failure modes and debugging tips): `docs/troubleshooting.md`.
- **Demo & submission prep** (3‑minute demo flow and story): `docs/demo-and-submission.md`.
- **Status & dev notes** (freeze status and contributor notes): `docs/status.md`, `docs/dev-notes.md`.

All documentation is written to reflect the current, frozen backend and polished frontend as of the submission‑prep phase.

