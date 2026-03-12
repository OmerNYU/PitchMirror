## Backend

The PitchMirror backend is a Fastify + TypeScript API that owns the **job lifecycle**, presigned S3 uploads, transcript handling, and access to the final coaching report.

It is deliberately minimal and is currently **feature‑frozen** except for bug fixes.

---

### Tech stack

- **Runtime**: Node.js (20 LTS recommended).
- **Framework**: Fastify.
- **Language**: TypeScript.
- **AWS SDK**: v3 clients for S3, DynamoDB, and Step Functions.
- **Data store**: DynamoDB table `pitchmirror2-jobs`.

---

### Setup and scripts

From the repo root:

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

Scripts:

- `npm run dev` – run in watch mode with TSX.
- `npm run build` – compile TypeScript to `dist/`.
- `npm run start` – run compiled server.
- `npm run typecheck` – type‑check only.

The server binds to `PORT` from env (default `8080`).

---

### Environment variables

See `backend/.env.example` for the full list. Key variables:

- **Core AWS config**
  - `AWS_REGION` – should be `us-east-1`.
  - `RAW_BUCKET` – e.g. `pitchmirror2-raw-omer-2026`.
  - `DERIVED_BUCKET` – e.g. `pitchmirror2-derived-omer-2026`.
  - `JOBS_TABLE` – `pitchmirror2-jobs`.
  - `PITCHMIRROR_SFN_ARN` – `arn:aws:states:us-east-1:127214190437:stateMachine:pitchmirror2-stub-pipeline`.

- **Presign / lifecycle**
  - `PRESIGN_EXPIRES_SECONDS` – lifetime for presigned PUT URLs.
  - `RAW_TTL_DAYS` – days before raw uploads expire in DynamoDB (TTL).

- **Server**
  - `PORT` – HTTP port, default `8080`.
  - `NODE_ENV` – `development`/`production`.
  - `ALLOWED_ORIGINS` – CORS origins (default `*`).

---

### Modes, tiers, and content types

The backend uses strongly typed enums defined in `backend/src/types.ts`:

- **Modes**:
  - `voice` – Audio coaching.
  - `presence` – Camera coaching.
  - `full` – Full pitch review.

- **Tiers**:
  - `free`
  - `pro`
  - `max`

  Each tier has a maximum allowed upload size (`TIER_MAX_BYTES`), e.g.:

  - `free`: 80 MB
  - `pro`: 200 MB
  - `max`: 500 MB

- **Allowed content types**:
  - `video/mp4`
  - `video/webm`
  - `video/quicktime`

These are enforced when creating jobs and finalizing uploads.

---

### Job lifecycle and status model

Jobs are stored as `JobRecord` items in DynamoDB with:

- **Status**:
  - `"CREATED"` – job created, waiting for upload.
  - `"UPLOADED"` – upload verified and accepted.
  - `"RUNNING"` – pipeline is processing (worker running).
  - `"SUCCEEDED"` – pipeline completed and report is ready.
  - `"FAILED"` – pipeline or validation failed.
  - `"PARTIAL"` – reserved for partial success scenarios.
  - `"EXPIRED"` – beyond TTL / cleanup (not actively used in the current workflow).

- **Stage**:
  - `"UPLOAD"` – presign and upload.
  - `"VALIDATE"` – `HeadObject` check and pipeline start.
  - `"AUDIO"` – audio extraction (worker).
  - `"TRANSCRIBE"` – transcript / subtitles handling (worker).
  - `"KEYFRAMES"` – keyframe extraction (worker).
  - `"METRICS"` – metrics computation.
  - `"NOVA"` – Nova / Bedrock integration.
  - `"FINALIZE"` – final report write and job completion.

The backend sets and returns `status` and `stage` consistently via `JobStatusResult` (`GET /jobs/:jobId`).

---

### Core flows

#### 1. Create job – `POST /jobs`

Handler: `backend/src/routes/jobs.ts` → `createJob` in `backend/src/core/jobs.ts`.

Input body (validated by `zod`):

- `mode`: `"voice" | "presence" | "full"`.
- `tier`: `"free" | "pro" | "max"`.
- `consent`: `boolean` – must be `true`, otherwise `CONSENT_REQUIRED`.
- `contentType`: one of the allowed video content types.

Behavior:

- Validates consent and content type.
- Generates a ULID `jobId`.
- Computes `rawKey = raw/<JOB_ID>/input.<ext>`.
- Persists a `JobRecord` with:
  - `status = "CREATED"`, `stage = "UPLOAD"`.
  - `mode`, `tier`, `consent`.
  - `rawBucket`, `rawKey`, `expectedContentType`, `maxBytes`.
  - TTL based on `RAW_TTL_DAYS`.
- Creates a presigned S3 PUT URL with the correct `Content-Type` and expiration.

Response (`CreateJobResult`):

- `jobId`
- `status` (`"CREATED"`)
- `stage` (`"UPLOAD"`)
- `rawBucket`
- `rawKey`
- `upload`:
  - `method: "PUT"`
  - `url: string`
  - `expiresInSeconds: number`
  - `requiredHeaders: { "content-type": string }`
- `limits: { maxBytes: number }`

**Important**: The client must upload the file with the exact `Content-Type` returned in `upload.requiredHeaders["content-type"]`.

#### 2. Upload video – `PUT` to S3

This step is performed directly by the client using the presigned URL; the backend is not in the data path for the upload.

Constraints:

- Must use method `PUT`.
- Must set the `Content-Type` header exactly as given by `POST /jobs`.
- Must upload the video under `rawBucket`/`rawKey`.

#### 3. Finalize job – `POST /jobs/:jobId/finalize`

Handler: `finalizeJob` in `backend/src/core/jobs.ts`.

Input:

- Path param: `jobId`.
- JSON body: `{ "rawKey": string }`.

Behavior:

- Loads the job from DynamoDB; returns `404 NOT_FOUND` if missing.
- Verifies that `body.rawKey === job.rawKey`, otherwise:
  - `400 INVALID_REQUEST` with message `"rawKey does not match this jobId"`.
- Performs `HeadObject` on the raw S3 object:
  - Fails with `413 INPUT_TOO_LARGE` if size exceeds `job.maxBytes`.
  - Fails with `400 INVALID_CONTENT_TYPE` if S3 `ContentType` differs from `job.expectedContentType`.
- Updates the job:
  - `status = "UPLOADED"`.
  - `stage = "VALIDATE"`.
  - Sets `uploadedAt`, `sizeBytes`, `contentType`, `etag`.
- Computes canonical `reportKey = derived/<JOB_ID>/report.json`.
- Starts the Step Functions state machine via `startStubPipeline`, passing:
  - `jobId`, `rawBucket`, `rawKey`, `derivedBucket`, `reportKey`, `mode`, `tier`, `transcriptKey`, `subtitlesKey`.
- Logs a structured JSON event containing `jobId`, `requestId`, and `pipelineStart`.

Response (`FinalizeJobResult`):

- `ok: true`
- `jobId`
- `status` (`"UPLOADED"` or `"FAILED"` if pipeline start is recorded as failed)
- `stage` (`"VALIDATE"`)
- `pipelineStart`: `"started" | "already_running" | "failed"`
- `requestId`: Fastify request id
- `executionArn` (when started successfully)
- `errorCode`, `errorMessage` (when pipeline start failed)

If pipeline start fails and the conditional update succeeds, the job may be moved to `FAILED` with error metadata.

#### 4. Transcript upload – `POST /jobs/:jobId/transcript`

Handler: `uploadTranscriptForJob` in `backend/src/core/jobs.ts`.

Input body:

- `transcriptText`: required string (max 1,000,000 characters).
- `subtitlesVtt`: optional string (max 1,000,000 characters).

Behavior:

- Loads the job; `404 NOT_FOUND` if missing.
- Derives:
  - `transcriptKey = derived/<JOB_ID>/transcript.json`.
  - `subtitlesKey = derived/<JOB_ID>/subtitles.vtt` (if VTT provided).
- Builds a payload:
  - `schema_version: "1.0"`
  - `generatedAt: <ISO now>`
  - `source: "user"`
  - `text: transcriptText`
- Writes `transcript.json` (and `subtitles.vtt` when present) to the **derived bucket** via `PutObject`.
- Updates the job to set `transcriptKey` and, when present, `subtitlesKey`.

Response (`UploadTranscriptResult`):

- `ok: true`
- `jobId`
- `transcriptKey`
- `subtitlesKey` (only when subtitles were provided)

These keys are later used by the worker to fetch transcript text for Nova.

#### 5. Job status – `GET /jobs/:jobId`

Handler: `getJobStatus` in `backend/src/core/jobs.ts`.

Returns (`JobStatusResult`):

- `jobId`
- `status`
- `stage`
- `mode`
- `tier`
- `createdAt`, `updatedAt`
- Optional:
  - `artifacts`
  - `executionArn`
  - `startedAt`, `finishedAt`
  - `errorCode`, `errorMessage`
  - `error` (structured error object)
  - `transcriptKey`, `subtitlesKey`

The frontend uses this endpoint to drive the studio status indicator and determine when to fetch the report.

#### 6. Fetch report – `GET /jobs/:jobId/report`

Handler: `getReportForJob` in `backend/src/core/jobs.ts` → `getReport` in `backend/src/services/report.ts`.

Behavior:

- Loads the job; `404 NOT_FOUND` if missing.
- Ensures `job.status === "SUCCEEDED"` and `job.reportKey` is present; otherwise:
  - `409 REPORT_NOT_READY`.
- Uses the configured `DERIVED_BUCKET` and `job.reportKey` to fetch `report.json` from S3.
- Validates the JSON against `ReportSchema`.
- Returns the validated report to the client.

Report shape (see `backend/src/services/report.ts` for the canonical schema):

- Required:
  - `overall: { score: number; summary: string }`
  - `top_fixes: array` (min 3)
  - `voice`, `presence`, `content`: section objects (with optional `score`, `highlights`, `improvements`, `notes`)
  - `practice_plan: array` (min 1)
  - `limitations: array` (min 1)
  - `artifacts: { raw: { bucket, key }, report: { bucket, key } }`
- Optional:
  - `schema_version`, `generatedAt`, `note`
  - `analysis_mode: "standard" | "ai" | "hybrid"`
  - `ai_used: boolean`
  - `transcript_used: boolean`

#### 7. Health – `GET /health`

Simple health check returning:

```json
{ "ok": true }
```

---

### Interaction with the worker and reports

- The backend never calls Nova directly; it delegates all analysis to the **ECS worker** via Step Functions.
- The only contract with the worker is:
  - Object layout in S3 buckets (`raw/` and `derived/` prefixes).
  - The canonical `report.json` located at `derived/<JOB_ID>/report.json`.
- The backend strictly validates all reports returned from S3 against `ReportSchema`.
  - If the worker ever wrote an invalid report, the backend would surface an `S3_ACCESS_ERROR` instead of serving bad data.

For step‑by‑step API examples (curl or client‑side usage), see `api.md` and `SMOKE_TEST.md`.

