import { PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { S3Client } from "@aws-sdk/client-s3";
import type { SFNClient } from "@aws-sdk/client-sfn";
import { ulid } from "ulid";
import type { Config } from "../config.js";
import type {
  JobRecord,
  Mode,
  Tier,
  Status,
  Stage,
  AllowedContentType,
} from "../types.js";
import { TIER_MAX_BYTES, CONTENT_TYPE_EXT } from "../types.js";
import { ApiError, ErrorCodes } from "../errors.js";
import { createPresignedPutUrl } from "../aws/presign.js";
import { headObject } from "../aws/s3-head.js";
import { startStubPipeline } from "../services/pipeline.js";
import { nowIso, ttlSeconds } from "../util/time.js";
import { getReport, type Report } from "../services/report.js";
import {
  writeTranscriptArtifacts,
  buildTranscriptPayload,
} from "../services/transcript.js";

export interface CreateJobInput {
  mode: Mode;
  tier: Tier;
  consent: boolean;
  contentType: AllowedContentType;
}

export interface CreateJobResult {
  jobId: string;
  status: Status;
  stage: Stage;
  rawBucket: string;
  rawKey: string;
  upload: {
    method: string;
    url: string;
    expiresInSeconds: number;
    requiredHeaders: { "content-type": string };
  };
  limits: { maxBytes: number };
}

export interface FinalizeJobInput {
  rawKey: string;
}

export interface FinalizeJobResult {
  ok: boolean;
  jobId: string;
  status: Status;
  stage: Stage;
  pipelineStart: "started" | "already_running" | "failed";
  requestId: string;
  executionArn?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface JobStatusResult {
  jobId: string;
  status: Status;
  stage: Stage;
  mode: Mode;
  tier: Tier;
  createdAt: string;
  updatedAt: string;
  artifacts?: Record<string, unknown> | null;
  executionArn?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  error?: { code: string; message: string } | null;
  transcriptKey?: string | null;
  subtitlesKey?: string | null;
}

export interface UploadTranscriptInput {
  transcriptText: string;
  subtitlesVtt?: string;
}

export interface UploadTranscriptResult {
  ok: boolean;
  jobId: string;
  transcriptKey: string;
  subtitlesKey?: string;
}

export interface JobsDeps {
  dynamo: DynamoDBDocumentClient;
  s3: S3Client;
  stepFunctions: SFNClient;
  config: Config;
}

export async function createJob(
  deps: JobsDeps,
  input: CreateJobInput
): Promise<CreateJobResult> {
  const { dynamo, s3, config } = deps;
  if (!input.consent) {
    throw new ApiError(
      400,
      ErrorCodes.CONSENT_REQUIRED,
      "Consent must be true"
    );
  }
  const ext = CONTENT_TYPE_EXT[input.contentType];
  if (!ext) {
    throw new ApiError(
      400,
      ErrorCodes.INVALID_CONTENT_TYPE,
      "Invalid contentType; must be video/mp4, video/webm, or video/quicktime"
    );
  }
  const maxBytes = TIER_MAX_BYTES[input.tier];
  const jobId = ulid();
  const rawKey = `raw/${jobId}/input${ext}`;
  const now = nowIso();
  const ttl = ttlSeconds(config.RAW_TTL_DAYS);

  const item: JobRecord = {
    jobId,
    status: "CREATED",
    stage: "UPLOAD",
    mode: input.mode,
    tier: input.tier,
    consent: input.consent,
    createdAt: now,
    updatedAt: now,
    ttl,
    rawBucket: config.RAW_BUCKET,
    rawKey,
    expectedContentType: input.contentType,
    maxBytes,
  };

  await dynamo.send(
    new PutCommand({
      TableName: config.JOBS_TABLE,
      Item: item,
    })
  );

  const url = await createPresignedPutUrl(
    s3,
    config.RAW_BUCKET,
    rawKey,
    input.contentType,
    config.PRESIGN_EXPIRES_SECONDS
  );

  return {
    jobId,
    status: "CREATED",
    stage: "UPLOAD",
    rawBucket: config.RAW_BUCKET,
    rawKey,
    upload: {
      method: "PUT",
      url,
      expiresInSeconds: config.PRESIGN_EXPIRES_SECONDS,
      requiredHeaders: { "content-type": input.contentType },
    },
    limits: { maxBytes },
  };
}

export async function finalizeJob(
  deps: JobsDeps,
  jobId: string,
  body: FinalizeJobInput,
  requestId: string
): Promise<FinalizeJobResult> {
  const { dynamo, s3, stepFunctions, config } = deps;

  const getRes = await dynamo.send(
    new GetCommand({
      TableName: config.JOBS_TABLE,
      Key: { jobId },
    })
  );

  const job = getRes.Item as JobRecord | undefined;
  if (!job) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, "Job not found");
  }

  if (body.rawKey !== job.rawKey) {
    throw new ApiError(
      400,
      ErrorCodes.INVALID_REQUEST,
      "rawKey does not match this jobId"
    );
  }

  const head = await headObject(s3, config.RAW_BUCKET, body.rawKey);
  const actualSizeBytes = head.contentLength;
  const actualContentType = head.contentType ?? "";
  const actualEtag = head.etag;

  if (actualSizeBytes > job.maxBytes) {
    throw new ApiError(
      413,
      ErrorCodes.INPUT_TOO_LARGE,
      "Upload exceeds tier size limit"
    );
  }

  if (actualContentType !== job.expectedContentType) {
    throw new ApiError(
      400,
      ErrorCodes.INVALID_CONTENT_TYPE,
      "Content-Type does not match job"
    );
  }

  const updatedAt = nowIso();
  await dynamo.send(
    new UpdateCommand({
      TableName: config.JOBS_TABLE,
      Key: { jobId },
      UpdateExpression:
        "SET #status = :status, #stage = :stage, #updatedAt = :updatedAt, #uploadedAt = :uploadedAt, #sizeBytes = :sizeBytes, #contentType = :contentType, #etag = :etag",
      ExpressionAttributeNames: {
        "#status": "status",
        "#stage": "stage",
        "#updatedAt": "updatedAt",
        "#uploadedAt": "uploadedAt",
        "#sizeBytes": "sizeBytes",
        "#contentType": "contentType",
        "#etag": "etag",
      },
      ExpressionAttributeValues: {
        ":status": "UPLOADED",
        ":stage": "VALIDATE",
        ":updatedAt": updatedAt,
        ":uploadedAt": updatedAt,
        ":sizeBytes": actualSizeBytes,
        ":contentType": actualContentType,
        ":etag": actualEtag ?? "",
      },
    })
  );

  const reportKey = `derived/${jobId}/report.json`;
  const pipelineResult = await startStubPipeline(
    stepFunctions,
    config.PITCHMIRROR_SFN_ARN,
    {
      jobId,
      rawBucket: job.rawBucket,
      rawKey: job.rawKey,
      derivedBucket: config.DERIVED_BUCKET,
      reportKey,
      mode: job.mode,
      tier: job.tier,
    }
  );

  console.log(
    JSON.stringify({
      level: "info",
      requestId,
      jobId,
      pipelineStart: pipelineResult.pipelineStart,
      ...(pipelineResult.pipelineStart === "started" &&
        pipelineResult.executionArn && {
          executionArn: pipelineResult.executionArn,
        }),
    })
  );

  let status: Status = "UPLOADED";
  let stage: Stage = "VALIDATE";

  if (pipelineResult.pipelineStart === "failed") {
    const failedUpdatedAt = nowIso();
    try {
      await dynamo.send(
        new UpdateCommand({
          TableName: config.JOBS_TABLE,
          Key: { jobId },
          UpdateExpression:
            "SET #status = :failed, #errorCode = :errorCode, #errorMessage = :errorMessage, #updatedAt = :updatedAt",
          ConditionExpression:
            "#stage = :expectedStage AND #status <> :succeeded",
          ExpressionAttributeNames: {
            "#status": "status",
            "#stage": "stage",
            "#errorCode": "errorCode",
            "#errorMessage": "errorMessage",
            "#updatedAt": "updatedAt",
          },
          ExpressionAttributeValues: {
            ":failed": "FAILED",
            ":expectedStage": "VALIDATE",
            ":succeeded": "SUCCEEDED",
            ":errorCode": pipelineResult.errorCode,
            ":errorMessage": pipelineResult.errorMessage,
            ":updatedAt": failedUpdatedAt,
          },
        })
      );
      status = "FAILED";
    } catch (condErr) {
      const e = condErr as { name?: string };
      if (
        e?.name !== "ConditionalCheckFailedException" &&
        e?.name !== "DynamoDB.ConditionalCheckFailedException"
      ) {
        throw condErr;
      }
    }
  }

  const result: FinalizeJobResult = {
    ok: true,
    jobId,
    status,
    stage,
    pipelineStart: pipelineResult.pipelineStart,
    requestId,
  };

  if (pipelineResult.pipelineStart === "started" && pipelineResult.executionArn) {
    result.executionArn = pipelineResult.executionArn;
  }
  if (pipelineResult.pipelineStart === "failed") {
    result.errorCode = pipelineResult.errorCode;
    result.errorMessage = pipelineResult.errorMessage;
  }

  return result;
}

export async function getJobStatus(
  deps: JobsDeps,
  jobId: string
): Promise<JobStatusResult> {
  const { dynamo, config } = deps;

  const getRes = await dynamo.send(
    new GetCommand({
      TableName: config.JOBS_TABLE,
      Key: { jobId },
    })
  );

  const job = getRes.Item as JobRecord | undefined;
  if (!job) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, "Job not found");
  }

  return {
    jobId: job.jobId,
    status: job.status,
    stage: job.stage,
    mode: job.mode,
    tier: job.tier,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    artifacts: job.artifacts ?? null,
    executionArn: job.executionArn ?? null,
    startedAt: job.startedAt ?? null,
    finishedAt: job.finishedAt ?? null,
    errorCode: job.errorCode ?? null,
    errorMessage: job.errorMessage ?? null,
    error: job.error ?? null,
    transcriptKey: job.transcriptKey ?? null,
    subtitlesKey: job.subtitlesKey ?? null,
  };
}

export async function uploadTranscriptForJob(
  deps: JobsDeps,
  jobId: string,
  body: UploadTranscriptInput
): Promise<UploadTranscriptResult> {
  const { dynamo, s3, config } = deps;

  const getRes = await dynamo.send(
    new GetCommand({
      TableName: config.JOBS_TABLE,
      Key: { jobId },
    })
  );

  const job = getRes.Item as JobRecord | undefined;
  if (!job) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, "Job not found");
  }

  const transcriptKey = `derived/${jobId}/transcript.json`;
  const hasSubtitles =
    body.subtitlesVtt != null && body.subtitlesVtt.trim() !== "";
  const subtitlesKey = hasSubtitles
    ? `derived/${jobId}/subtitles.vtt`
    : undefined;

  const payload = buildTranscriptPayload(body.transcriptText);
  await writeTranscriptArtifacts(
    s3,
    config.DERIVED_BUCKET,
    transcriptKey,
    payload,
    subtitlesKey,
    body.subtitlesVtt
  );

  const updatedAt = nowIso();

  if (subtitlesKey != null) {
    await dynamo.send(
      new UpdateCommand({
        TableName: config.JOBS_TABLE,
        Key: { jobId },
        UpdateExpression:
          "SET #transcriptKey = :transcriptKey, #updatedAt = :updatedAt, #subtitlesKey = :subtitlesKey",
        ExpressionAttributeNames: {
          "#transcriptKey": "transcriptKey",
          "#updatedAt": "updatedAt",
          "#subtitlesKey": "subtitlesKey",
        },
        ExpressionAttributeValues: {
          ":transcriptKey": transcriptKey,
          ":updatedAt": updatedAt,
          ":subtitlesKey": subtitlesKey,
        },
      })
    );
  } else {
    await dynamo.send(
      new UpdateCommand({
        TableName: config.JOBS_TABLE,
        Key: { jobId },
        UpdateExpression:
          "SET #transcriptKey = :transcriptKey, #updatedAt = :updatedAt REMOVE #subtitlesKey",
        ExpressionAttributeNames: {
          "#transcriptKey": "transcriptKey",
          "#updatedAt": "updatedAt",
          "#subtitlesKey": "subtitlesKey",
        },
        ExpressionAttributeValues: {
          ":transcriptKey": transcriptKey,
          ":updatedAt": updatedAt,
        },
      })
    );
  }

  const result: UploadTranscriptResult = {
    ok: true,
    jobId,
    transcriptKey,
  };
  if (subtitlesKey != null) {
    result.subtitlesKey = subtitlesKey;
  }
  return result;
}

export async function getReportForJob(
  deps: JobsDeps,
  jobId: string
): Promise<Report> {
  const { dynamo, s3, config } = deps;

  const getRes = await dynamo.send(
    new GetCommand({
      TableName: config.JOBS_TABLE,
      Key: { jobId },
    })
  );

  const job = getRes.Item as JobRecord | undefined;
  if (!job) {
    throw new ApiError(404, ErrorCodes.NOT_FOUND, "Job not found");
  }

  if (job.status !== "SUCCEEDED" || !job.reportKey) {
    throw new ApiError(
      409,
      ErrorCodes.REPORT_NOT_READY,
      "Report not ready; job must be SUCCEEDED"
    );
  }

  return getReport(s3, config.DERIVED_BUCKET, job.reportKey);
}

