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
- Build a report object that conforms to the backend `ReportSchema` and upload
  it as `derived/<JOB_ID>/report.json`.

## Environment variables

The worker expects the following environment variables:

- `JOB_ID` – unique job identifier.
- `RAW_BUCKET` – S3 bucket containing the uploaded video.
- `RAW_KEY` – S3 key of the uploaded video.
- `DERIVED_BUCKET` – S3 bucket for all derived artifacts.
- `MODE` – one of: `voice`, `presence`, `full`.
- `TIER` – one of: `free`, `pro`, `max` (controls duration caps).

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
- Compute metrics and build a report.
- Upload all artifacts under `derived/<JOB_ID>/...` in the derived bucket.

You can inspect the outputs with the AWS CLI:

```bash
aws s3 ls "s3://your-derived-bucket/derived/job-123/"
aws s3 cp "s3://your-derived-bucket/derived/job-123/report.json" - | jq .
```

## Security and logging

- The worker **must not** print AWS credentials or presigned URLs.
- Logs are structured JSON-ish records written to stdout, including useful
  fields like `jobId`, `mode`, `tier`, media duration, and the list of
  uploaded S3 keys.

## Minimal report shape test

There is a small test script that constructs a sample report and runs the
Python-side validation used by the worker. To run it:

```bash
cd worker
python test_report_schema.py
```

The script exits with status 0 if the sample report matches the expected shape,
and non-zero otherwise.

