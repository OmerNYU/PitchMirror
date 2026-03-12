# PitchMirror — System Architecture

**Goal:** Ship a reliable, demo-ready PitchMirror that provides high-quality presentation coaching using **Nova** (as the core reasoning engine) while keeping **cost, latency, and complexity** under control.

This document is the **single source of truth** for architecture, constraints, objectives, and design decisions. Cursor should reference this continuously during implementation.

---

## 0) Product Definition

PitchMirror is an AI coach for presentation practice that produces:
- **Voice coaching** (pacing, pauses, filler words, clarity, structure)
- **Presence coaching** (posture, gaze, expressiveness, gestures)
- **Full coaching** (combined prioritized fixes + drills + practice plan)

**Core design principle:**  
We do **media preprocessing ourselves** (audio extraction, transcription, keyframe extraction, lightweight metrics). We send Nova a **compact evidence pack** (transcript + metrics + selected keyframes) and have Nova produce a structured coaching report.

---

## 1) Hackathon Track

**Primary track:** **Multimodal Understanding**  
Because we combine **visual evidence (keyframes/images)** + **speech (transcript/metrics)** + **reasoning** to produce feedback.

---

## 2) Non-Negotiable Constraints & Design Implications

### 2.1 Nova modality constraints
- **Video understanding is visual-only** → do NOT rely on Nova to analyze audio.
- **Full video inference is expensive** (tokens scale with duration) → do NOT send full video to Nova for the MVP.
- Prefer **images + text** (keyframes + transcript) for predictable token spend.

### 2.2 Inference latency constraint
- Nova inference can be long-running → architecture **must be asynchronous** (job pipeline), never “upload → wait in same HTTP request”.

### 2.3 Reasoning config constraint
- Keep default reasoning effort **low/medium** for cost + reliability.
- Only enable “high” behind a premium toggle, with strict parameter compatibility rules.

### 2.4 Compute budget
- Video processing is CPU-heavy → use containerized compute (ECS Fargate) rather than Lambda for FFmpeg/CV-heavy work.

### 2.5 Reliability objectives
- The system must **always return a useful result**, even if some stages fail.
- Partial fallbacks are mandatory (Voice-only or Presence-only).

---

## 3) Product Modes & Tiers

### 3.1 User Modes
1) **Voice Coach (cheapest)**
   - Uses transcript + audio metrics
2) **Presence Coach (cheap)**
   - Uses keyframes + visual metrics
3) **Full Coach (best)**
   - Uses transcript + audio metrics + keyframes + visual metrics

### 3.2 Suggested Tier Caps (enforced server-side)
> These caps are essential for predictable latency and cost.

| Tier | Max Video | Keyframes to Nova | Reasoning | Notes |
|------|-----------|-------------------|----------|------|
| Free | 45s | 3 | low | Allow Voice or Presence; Full allowed but tighter output |
| Pro  | 2m | 5 | medium | Default Full Coach |
| Max  | 5m | 5 | medium (+ optional high) | Richer drills, more transcript context |

---

## 4) High-Level System Overview

### 4.1 Core Components (AWS-first)
- **Client:** Next.js/React web app
- **Auth (optional):** Cognito (or anonymous sessions)
- **API:** API Gateway + Lambda (thin controllers)
- **Storage:** S3 raw + S3 derived (private, encrypted)
- **Job DB:** DynamoDB for job metadata/state
- **Orchestration:** Step Functions state machine (async workflow)
- **Compute:** ECS Fargate tasks (FFmpeg + CV + metrics)
- **Transcription:** Amazon Transcribe (async)
- **Nova inference:** Amazon Bedrock Runtime → Nova (Converse API)

### 4.2 Why this architecture
- Direct-to-S3 uploads avoid backend bottlenecks
- Step Functions provides retries/timeouts/audit trail
- ECS handles long CPU tasks without Lambda limits
- Separates concerns cleanly → “debt-free” and maintainable

---

## 5) End-to-End Data Flow

### Step A — Create Job + Direct Upload
1) Client calls `POST /jobs` with `{mode, tier, consent}`
2) API returns `{jobId, presignedUploadUrl, constraints}`
3) Client uploads video to S3 (raw bucket)
4) Client calls `POST /jobs/{jobId}/finalize` with `{s3Key, sha256}`

### Step B — Start Pipeline
- Finalize triggers Step Functions `StartExecution` (idempotent name = jobId)

### Step C — State Machine Stages (canonical)
1) **ValidateInput**
   - Confirm object exists, size <= tier cap
   - ffprobe: duration/fps/resolution/audio track present
2) **ExtractAudio** (if voice/full)
   - FFmpeg → `audio.wav` (16kHz mono)
3) **TranscribeAudio** (if voice/full)
   - Amazon Transcribe job → `transcript.json` (timestamps)
4) **ExtractKeyframes** (if presence/full)
   - Produce **K=3/5** keyframes for Nova
   - Optional: extra UI preview frames stored but not sent
5) **ComputeMetrics**
   - Audio metrics + visual metrics (+ content structure metrics)
6) **BuildEvidencePack**
   - JSON containing transcript + metrics + keyframe references
7) **CallNova**
   - Nova generates structured report JSON
8) **ValidateOutput**
   - JSON Schema validation
   - Repair attempt once if invalid JSON
9) **PersistResults**
   - Save `report.json` + summary + artifacts
   - Update DynamoDB status → SUCCEEDED
10) **Complete**
   - Client polls `GET /jobs/{jobId}` and fetches results

---

## 6) Keyframe Extraction (Robust, Deterministic)

### 6.1 Requirements
- Avoid bad frames (no face, too dark, blurry)
- Capture representative moments (early/mid/late)

### 6.2 Algorithm (recommended)
1) Candidate timestamps:
   - `t = duration * {0.15, 0.30, 0.50, 0.70, 0.85}` (for K=5)
   - For K=3: `{0.25, 0.55, 0.85}`
2) Extract frames with FFmpeg
3) Score each frame:
   - Face detected? (binary)
   - Face size (prefer moderate-large)
   - Blur score (variance of Laplacian)
   - Brightness range (avoid extremes)
4) Replace bad frames:
   - Use scene-change detection fallback near that region
   - Or pick nearest good frame

### 6.3 Privacy UX
- Always show selected keyframes in UI before analysis
- Allow user to remove a keyframe and replace with nearest alternative

---

## 7) Metrics Computation (Local, Cheap, Reliable)

### 7.1 Audio/Transcript metrics (Voice/Full)
- Speaking rate: words per minute
- Pause distribution: counts and durations (from timestamps)
- Filler words: “um”, “uh”, “like”, “you know”, etc.
- Repetition: repeated phrases and redundancy
- Sentence length + complexity
- Structure heuristic: hook → problem → solution → proof → ask (best-effort)

### 7.2 Visual metrics (Presence/Full)
(Keep lightweight; do not overpromise.)
- Face visibility percentage
- Head pose variance proxy (stability)
- Eye-line drift proxy (gaze consistency)
- Shoulder symmetry proxy (posture)
- Gesture intensity proxy (movement energy)

**Note:** These are “proxies,” not perfect ground truth. Keep claims conservative.

---

## 8) Nova Interaction Contract

### 8.1 Evidence Pack sent to Nova
- `mode`, `tier`, `rubric_version`
- Transcript (full for short clips; excerpted for long)
- Audio metrics + visual metrics
- Keyframes as image inputs or references (S3 URIs recommended)
- User goal (optional): e.g., “investor pitch”, “class presentation”

### 8.2 Output MUST be strict JSON
We validate against schema; report must include:

```json
{
  "overall": { "score": 0, "summary": "" },
  "top_fixes": [ { "issue": "", "why": "", "drill": "", "expected_gain": "" } ],
  "voice": { "pace": {}, "pauses": {}, "fillers": {}, "rewrite_lines": [] },
  "presence": { "posture": "", "gaze": "", "expressiveness": "", "drills": [] },
  "content": { "structure": "", "clarity": "", "evidence": "", "cta": "" },
  "practice_plan": [ { "session": 1, "minutes": 10, "focus": "", "steps": [] } ],
  "limitations": [ "" ]
}
```

### 8.3 JSON robustness rules
- If Nova output invalid:
  - Run **one repair call**: “Return valid JSON only; no prose.”
  - If still invalid: fall back to “text summary” and mark job PARTIAL.

### 8.4 Cost & reasoning policy
- Default reasoning effort:
  - Free: low
  - Pro: medium
  - Max: medium; optional high (toggle)
- Always cap output tokens via maxTokens.

---

## 9) API Contract (Minimal, Clean)

### 9.1 Endpoints
- `POST /jobs`
  - Create job + return presigned upload URL
- `POST /jobs/{jobId}/finalize`
  - Confirm upload + start workflow
- `GET /jobs/{jobId}`
  - Get status + stage + artifact pointers
- `GET /jobs/{jobId}/report`
  - Return final report JSON (signed URL or proxied)

### 9.2 Status model
`CREATED | UPLOADING | UPLOADED | RUNNING | SUCCEEDED | FAILED | PARTIAL | EXPIRED`

### 9.3 Error codes (standardize)
- `INPUT_TOO_LARGE`
- `UNSUPPORTED_FORMAT`
- `NO_AUDIO_TRACK`
- `TRANSCRIBE_FAILED`
- `KEYFRAME_FAILED`
- `NOVA_TIMEOUT`
- `NOVA_INVALID_JSON`
- `INTERNAL_ERROR`

---

## 10) Data Model (DynamoDB Jobs Table)

Partition Key: `JOB#{jobId}`

Fields:
- `jobId`
- `userId` or `anonSessionId`
- `mode`, `tier`
- `status`, `stage`
- `createdAt`, `updatedAt`, `ttl`
- `input`: `{rawVideoS3Key, durationSec, sizeBytes, checksum}`
- `artifacts`: `{audioKey, transcriptKey, keyframeKeys[], metricsKey, reportKey}`
- `usage`: `{estimatedTokensIn, estimatedTokensOut, actualTokensIfAvailable}`
- `error`: `{code, message, retryable, details}`

Idempotency:
- Step Functions execution name = jobId
- Each stage uses deterministic output keys in S3

---

## 11) Reliability / Fallback Policy (Must-Have)

If a stage fails, still try to produce something:

- If **Transcribe fails** → run Presence Coach if keyframes exist
- If **Keyframes fail** → run Voice Coach if transcript exists
- If **Nova fails** → return metrics-only report + partial status

Never “black hole” the user with failure unless input is invalid.

---

## 12) Security & Privacy Checklist

- S3 private buckets, SSE-S3 or SSE-KMS
- Presigned URLs:
  - short expiry
  - strict content-type
  - max size
- Retention:
  - DynamoDB TTL
  - S3 lifecycle delete raw videos after N days (e.g., 7)
- UI consent required before upload
- Keyframe preview + removal

---

## 13) Observability (Debuggable by Design)

- CloudWatch logs per stage (jobId in every line)
- Metrics:
  - stage duration histograms
  - failure counters by errorCode
  - Nova latency and retries
- Trace ID propagation: `X-Request-Id` and `jobId`

---

## 14) Deployment Notes (Hackathon-friendly)

### MVP deployment
- API Gateway + Lambda
- Step Functions
- ECS Fargate task definition (FFmpeg + Python)
- S3 buckets (raw + derived)
- DynamoDB Jobs table
- Transcribe
- Bedrock Nova access

### “Must work for judges”
- Provide a hosted demo URL
- Provide test credentials if gated
- Ensure artifacts persist through judging window

---

## 15) Test Plan (Before any demo video)

### Functional tests
- Upload short mp4 with audio → Full Coach succeeds
- Upload video without audio → Presence works; Voice returns friendly notice
- Upload too long video → server rejects with clear error
- Force Nova invalid JSON (simulate) → repair path works
- Kill ECS task mid-run → Step Functions retry produces final result

### Performance tests
- Free tier 45s → results in acceptable time
- Pro tier 2m → bounded cost and stable

---

## 16) Cursor Implementation Guidelines (No Drift)

Cursor must adhere to:
- **Async job pipeline only** (no blocking on inference in request)
- **ECS for FFmpeg/CV** (avoid Lambda heavy processing)
- **Strict JSON schema outputs** from Nova + validation
- **Tier enforcement server-side**
- **Fallback paths** implemented from day 1
- **Single source of truth**: this file

---

## 17) Milestone Roadmap (Execution Order)

1) API + S3 presigned upload + DynamoDB jobs
2) Step Functions skeleton + status updates
3) ECS task: ffprobe + keyframes + audio extraction
4) Transcribe integration
5) Metrics computation
6) Nova call + JSON schema + repair
7) UI: upload → status → report rendering
8) Tier caps + budget indicator
9) Hardening: retries, fallbacks, retention, logs
10) Demo script + final polish

---

## 18) Definition of Done (MVP)

- User uploads video and selects mode/tier
- Job finishes with a structured coaching report
- UI shows keyframes, metrics, and top fixes
- System handles common failure cases gracefully
- Costs are bounded via tier limits and keyframe caps
- Demo works repeatedly with 3 test videos

---

**End of architecture reference.**
