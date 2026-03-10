# PitchMirror ECS Fargate Worker

This folder contains the Python worker that runs in ECS Fargate to process
uploaded pitch videos, generate media artifacts, compute metrics, and write a
schema-valid `report.json` into the derived S3 bucket.

## Responsibilities

- Download the raw video from S3 **streaming** with `boto3` (no full in-memory reads).
- Run `ffprobe` to capture media metadata (`ffprobe.json`).
- Enforce duration caps based on the job `TIER`.
- Optionally extract mono 16kHz WAV audio and compute RMS.
- Optionally extract keyframes for presence analysis.
- Compute `metrics.json`.
- Build a heuristic report and optionally call Nova (Bedrock Converse) for
  enhanced analysis. Upload `report.standard.json` (always), `report.ai.json`
  (when AI succeeds), and `report.json` (the final canonical report).

## Environment variables

**Required:**

- `JOB_ID` – unique job identifier.
- `RAW_BUCKET` – S3 bucket containing the uploaded video.
- `RAW_KEY` – S3 key of the uploaded video.
- `DERIVED_BUCKET` – S3 bucket for all derived artifacts.
- `MODE` – one of: `voice`, `presence`, `full`.
- `TIER` – one of: `free`, `pro`, `max` (controls duration caps).

**Optional:**

- `TRANSCRIPT_KEY` – S3 key of transcript JSON (e.g. user-uploaded). When set,
  the worker reads `payload.text` and may send it to Nova for voice/full mode.
- `SUBTITLES_KEY` – S3 key of WebVTT subtitles (informational; not sent to Nova).
- `BEDROCK_MODEL_ID` – Bedrock model id for Nova (e.g. `amazon.nova-pro-v1:0`).
  If unset, only the heuristic report is produced.

If any required variable is missing or invalid, the worker logs a configuration
error and exits with a non-zero status.

## Building the Docker image

From the repo root:

```bash
cd worker
docker build -t pitchmirror-worker .
```

## Running locally against real dev buckets

You can run the worker container against your actual dev RAW/DERIVED buckets.
The example below assumes your AWS credentials are exported in the
environment (e.g. via `aws configure` / IAM role).

```bash
docker run --rm \
  -e AWS_REGION=us-east-1 \
  -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
  -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
  -e JOB_ID="job-123" \
  -e RAW_BUCKET="your-raw-bucket" \
  -e RAW_KEY="raw/job-123/input.mp4" \
  -e DERIVED_BUCKET="your-derived-bucket" \
  -e MODE="full" \
  -e TIER="free" \
  pitchmirror-worker
```

This will:

- Stream-download the raw video to `/tmp/input.mp4`.
- Run `ffprobe` and write `ffprobe.json`.
- Enforce the duration cap for the given `TIER`.
- Extract audio and/or frames depending on `MODE`.
- Compute metrics and build a heuristic report.
- Upload `derived/<JOB_ID>/report.standard.json` (baseline report).
- If `BEDROCK_MODEL_ID` is set and Nova succeeds, upload
  `derived/<JOB_ID>/report.ai.json` and set the final report from AI or a
  heuristic+AI merge (depending on mode and transcript).
- Upload `derived/<JOB_ID>/report.json` (the canonical final report; backend
  serves this key).

You can inspect the outputs with the AWS CLI:

```bash
aws s3 ls "s3://your-derived-bucket/derived/job-123/"
aws s3 cp "s3://your-derived-bucket/derived/job-123/report.json" - | jq .
# report.json may include analysis_mode, ai_used, transcript_used.
```

## Security and logging

- The worker **must not** print AWS credentials or presigned URLs.
- Logs are structured JSON-ish records written to stdout, including useful
  fields like `jobId`, `mode`, `tier`, media duration, and the list of
  uploaded S3 keys.

## Report shape tests

The test script builds sample reports (heuristic, with metadata, and hybrid
merge) and runs the Python-side validation used by the worker:

```bash
cd worker
python3 test_report_schema.py
```

Use a virtualenv with `pip install -r requirements.txt` if needed. The script
exits with status 0 if all report shapes pass validation, and non-zero otherwise.

