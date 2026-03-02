# PitchMirror 2.0 Backend

API for job creation, presigned S3 upload, and job status. Built with Fastify, TypeScript, and AWS SDK v3.

## Prerequisites

- **Node 20 LTS** (recommended; avoids Node 24 ecosystem incompatibilities)
- AWS CLI configured (credentials and region for us-east-1, or set `AWS_REGION`)

## Setup

```bash
cp .env.example .env
# Edit .env with your RAW_BUCKET, DERIVED_BUCKET, JOBS_TABLE

npm install
```

## Run

```bash
npm run dev
```

Server binds to `PORT` from env (default 8080).

## API

### Health

```bash
curl -s http://localhost:8080/health
# {"ok":true}
```

### Create job (get presigned URL)

```bash
curl -s -X POST http://localhost:8080/jobs \
  -H "Content-Type: application/json" \
  -d '{"mode":"voice","tier":"free","consent":true,"contentType":"video/mp4"}'
```

Response includes `jobId`, `rawKey`, `upload.url` (presigned PUT URL), and `limits.maxBytes`.

### Upload file to S3 (use presigned URL)

Use the `upload.url` from the create response. **You must set the same Content-Type as in the create request.**

```bash
# Replace <PRESIGNED_URL> and ensure Content-Type matches (e.g. video/mp4)
curl -X PUT "<PRESIGNED_URL>" \
  -H "Content-Type: video/mp4" \
  -T /path/to/your/video.mp4
```

### Finalize job

After uploading, call finalize with the **exact** `rawKey` returned from create (e.g. `raw/<jobId>/input.mp4`). The server verifies the object in S3 via HeadObject and stores size/contentType/etag from S3.

```bash
# Replace <JOB_ID> with the jobId from create response
curl -s -X POST http://localhost:8080/jobs/<JOB_ID>/finalize \
  -H "Content-Type: application/json" \
  -d '{"rawKey":"raw/<JOB_ID>/input.mp4"}'
```

Response: `{"ok":true,"jobId":"...","status":"UPLOADED","stage":"VALIDATE","pipelineStart":"started"|"already_running"|"failed","requestId":"..."}`. On pipeline start failure, `status` may be `"FAILED"` with `errorCode` and `errorMessage`.

### Get job status

```bash
curl -s http://localhost:8080/jobs/<JOB_ID>
```

Returns `jobId`, `status`, `stage`, `mode`, `tier`, `createdAt`, `updatedAt`, and optionally `artifacts`, `error`.

## Scripts

- `npm run dev` — run with tsx (watch mode)
- `npm run build` — compile TypeScript to `dist/`
- `npm run start` — run compiled `dist/index.js`
- `npm run typecheck` — type-check only

## Env vars

See `.env.example`. Required: `AWS_REGION`, `RAW_BUCKET`, `DERIVED_BUCKET`, `JOBS_TABLE`, `PITCHMIRROR_SFN_ARN`, `PRESIGN_EXPIRES_SECONDS`, `RAW_TTL_DAYS`, `NODE_ENV`, `PORT`. Optional: `ALLOWED_ORIGINS` (default `*`).
