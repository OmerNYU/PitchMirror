## PitchMirror 2.0 Smoke Test

This checklist validates the end-to-end demo flow for judges using the deployed backend (and optionally the UI).

Follow these steps in order. If any step fails, use the troubleshooting section at the end.

---

### Prerequisites

- **Backend running**: `cd backend && npm run dev`
- **Env configured**: `.env` populated from `.env.example` with valid:
  - `AWS_REGION`
  - `RAW_BUCKET`
  - `DERIVED_BUCKET`
  - `JOBS_TABLE`
  - `PITCHMIRROR_SFN_ARN`
- **AWS resources deployed**:
  - DynamoDB table for jobs
  - RAW and DERIVED S3 buckets
  - Stub Step Functions state machine
- **Sample video file**:
  - Short clip, e.g. `sample.mp4` (10–30 seconds, `video/mp4`)

All commands below assume the backend is on `http://localhost:8080`.

---

### 1) Create job – `POST /jobs`

From the repo root:

```bash
cd backend

curl -s -X POST http://localhost:8080/jobs \
  -H "Content-Type: application/json" \
  -d '{"mode":"voice","tier":"free","consent":true,"contentType":"video/mp4"}' | tee /tmp/pitchmirror-job.json
```

Verify the response JSON includes at least:

- `jobId` (string)
- `status: "CREATED"`
- `stage: "UPLOAD"`
- `rawBucket`
- `rawKey`
- `upload.url` (long presigned URL)
- `upload.requiredHeaders["content-type"]` (e.g. `video/mp4`)

Extract helper variables (optional but handy):

```bash
JOB_ID=$(jq -r '.jobId' /tmp/pitchmirror-job.json)
RAW_KEY=$(jq -r '.rawKey' /tmp/pitchmirror-job.json)
UPLOAD_URL=$(jq -r '.upload.url' /tmp/pitchmirror-job.json)
CONTENT_TYPE=$(jq -r '.upload.requiredHeaders["content-type"]' /tmp/pitchmirror-job.json)
echo "JOB_ID=$JOB_ID"
echo "RAW_KEY=$RAW_KEY"
echo "UPLOAD_URL=$UPLOAD_URL"
echo "CONTENT_TYPE=$CONTENT_TYPE"
```

---

### 2) Upload video – `PUT` to presigned URL

Use the exact `Content-Type` from the create response.

```bash
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: $CONTENT_TYPE" \
  -T /path/to/sample.mp4
```

Expected: HTTP 200 / 204 or empty response (S3 success).

**Important:** The `Content-Type` header **must exactly match** what was sent to `POST /jobs` (e.g. `video/mp4`). If it differs, finalize will fail with `INVALID_CONTENT_TYPE`.

---

### 3) Finalize job – `POST /jobs/:jobId/finalize`

```bash
curl -s -X POST "http://localhost:8080/jobs/$JOB_ID/finalize" \
  -H "Content-Type: application/json" \
  -d "{\"rawKey\":\"$RAW_KEY\"}" | tee /tmp/pitchmirror-finalize.json
```

Expected fields:

- `ok: true`
- `jobId` equals `$JOB_ID`
- `status` is `"UPLOADED"` or `"FAILED"` (if pipeline failed immediately)
- `stage: "VALIDATE"`
- `pipelineStart` is one of:
  - `"started"` (normal case)
  - `"already_running"` (idempotent re-run)
  - `"failed"` (stub pipeline failed to start; `errorCode`/`errorMessage` will be present)

For the happy path, you should see `pipelineStart: "started"`.

---

### 4) Poll job status – `GET /jobs/:jobId`

The stub state machine usually completes in a few seconds.

```bash
while true; do
  curl -s "http://localhost:8080/jobs/$JOB_ID" | tee /tmp/pitchmirror-status.json
  echo
  STATUS=$(jq -r '.status' /tmp/pitchmirror-status.json)
  if [ "$STATUS" = "SUCCEEDED" ] || [ "$STATUS" = "FAILED" ]; then
    break
  fi
  sleep 2
done
```

Expected final status for a successful demo:

- `status: "SUCCEEDED"`
- `stage: "FINALIZE"`
- `executionArn` present
- `startedAt` and `finishedAt` set
- `reportKey` set under the `artifacts` or top-level job fields, depending on pipeline version

---

### 5) Fetch report – `GET /jobs/:jobId/report`

```bash
curl -s "http://localhost:8080/jobs/$JOB_ID/report" | tee /tmp/pitchmirror-report.json
```

Expected JSON shape (from the stub report schema):

- `overall`:
  - `score` (number)
  - `summary` (string)
- `top_fixes`: array of objects, each with:
  - `issue`
  - `why`
  - `drill`
  - `expected_gain`
- `voice`: object (may contain a `note` in the stub)
- `presence`: object
- `content`: object
- `artifacts`: object (contains raw and report locations)
- Optional `note` string

If this JSON validates and looks coherent, the end-to-end pipeline is wired.

---

### Optional: UI flow

If the frontend is running, you can perform the same flow via the web app:

- Open the app in the browser.
- Create a new job (select mode/tier, accept consent).
- Upload your `sample.mp4`.
- Click to finalize / submit.
- Watch the status progress until the report is ready.
- View the rendered report and confirm it matches the stub structure above.

This should be consistent with the API-based flow.

---

### AWS Console Verification

Use the AWS Console to cross-check that the pipeline did what it should.

- **Step Functions**
  - Open the Step Functions console.
  - Find the stub state machine referenced by `PITCHMIRROR_SFN_ARN`.
  - Confirm there is an execution whose **name equals `JOB_ID`**.
  - Execution should show success with the stub states.

- **S3 – Derived bucket**
  - Open the S3 console.
  - Navigate to the `DERIVED_BUCKET` from `.env`.
  - Confirm there is a `report.json` object under:
    - `derived/<JOB_ID>/report.json`

- **DynamoDB – Jobs table**
  - Open the DynamoDB console.
  - Find the table named `JOBS_TABLE` from `.env`.
  - Look up the item with partition key `jobId = JOB_ID`.
  - Confirm:
    - `executionArn` is set.
    - `startedAt` and `finishedAt` are set.
    - `status` is `"SUCCEEDED"`.
    - `stage` is `"FINALIZE"`.
    - `reportKey` points at `derived/<JOB_ID>/report.json`.

If all three console checks pass, the system is in a reliable, demo-ready state.

---

### Troubleshooting

- **Create job fails**
  - Check that the backend is running and `.env` is configured.
  - Ensure `contentType` is one of: `video/mp4`, `video/webm`, `video/quicktime`.

- **Upload to presigned URL fails**
  - Verify that the presigned URL has not expired (default 15 minutes).
  - Ensure you are using the exact `Content-Type` from the job response.

- **Finalize returns 400 / 413**
  - `INVALID_REQUEST` / `rawKey does not match this jobId`: make sure you passed the exact `rawKey` from the create response.
  - `INPUT_TOO_LARGE`: the file exceeds the tier’s size cap; try a shorter/smaller video.
  - `INVALID_CONTENT_TYPE`: Content-Type on upload did not match the job.

- **Pipeline start failed (`pipelineStart: "failed"`)**
  - Check `errorCode` and `errorMessage` in the finalize response.
  - Validate that `PITCHMIRROR_SFN_ARN` points to an existing state machine and IAM permissions allow `StartExecution`.

- **Polling never reaches SUCCEEDED**
  - Inspect the Step Functions execution in the console for state-level errors.
  - Check the derived S3 bucket for `report.json`; if missing, the pipeline failed before writing.

If needed, you can always create a fresh job and repeat the checklist from step 1.

