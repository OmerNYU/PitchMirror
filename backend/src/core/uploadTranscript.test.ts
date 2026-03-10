import { describe, it, expect, vi } from "vitest";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { S3Client } from "@aws-sdk/client-s3";
import type { SFNClient } from "@aws-sdk/client-sfn";
import type { JobRecord } from "../types.js";
import type { Config } from "../config.js";
import { ErrorCodes } from "../errors.js";
import { uploadTranscriptForJob, type JobsDeps } from "./jobs.js";

function createTestConfig(): Config {
  return {
    AWS_REGION: "us-east-1",
    RAW_BUCKET: "test-raw-bucket",
    DERIVED_BUCKET: "test-derived-bucket",
    JOBS_TABLE: "test-jobs-table",
    PRESIGN_EXPIRES_SECONDS: 900,
    RAW_TTL_DAYS: 7,
    NODE_ENV: "test",
    PORT: 8080,
    ALLOWED_ORIGINS: "*",
    PITCHMIRROR_SFN_ARN:
      "arn:aws:states:us-east-1:123456789012:stateMachine:stub",
  };
}

function createBaseJob(config: Config): JobRecord {
  const now = "2025-01-01T00:00:00.000Z";
  return {
    jobId: "job-123",
    status: "CREATED",
    stage: "UPLOAD",
    mode: "voice",
    tier: "free",
    consent: true,
    createdAt: now,
    updatedAt: now,
    ttl: 123456,
    rawBucket: config.RAW_BUCKET,
    rawKey: "raw/job-123/input.mp4",
    expectedContentType: "video/mp4",
    maxBytes: 50 * 1024 * 1024,
  };
}

function createStubDynamo(sendImpl: ReturnType<typeof vi.fn>): DynamoDBDocumentClient {
  return {
    send: sendImpl,
  } as unknown as DynamoDBDocumentClient;
}

function createStubS3(sendImpl: ReturnType<typeof vi.fn>): S3Client {
  return {
    send: sendImpl,
  } as unknown as S3Client;
}

function createStubSFN(sendImpl: ReturnType<typeof vi.fn>): SFNClient {
  return {
    send: sendImpl,
  } as unknown as SFNClient;
}

describe("uploadTranscriptForJob", () => {
  it("returns 404 NOT_FOUND when job does not exist", async () => {
    const config = createTestConfig();
    const dynamoSend = vi.fn().mockResolvedValue({ Item: undefined });
    const s3Send = vi.fn();

    const deps: JobsDeps = {
      dynamo: createStubDynamo(dynamoSend),
      s3: createStubS3(s3Send),
      stepFunctions: createStubSFN(vi.fn()),
      config,
    };

    await expect(
      uploadTranscriptForJob(deps, "job-123", {
        transcriptText: "Some transcript text.",
      })
    ).rejects.toMatchObject({
      httpStatus: 404,
      code: ErrorCodes.NOT_FOUND,
      message: "Job not found",
    });

    expect(dynamoSend).toHaveBeenCalledTimes(1);
    expect(s3Send).not.toHaveBeenCalled();
  });

  it("writes transcript and subtitles to S3 and updates Dynamo with both keys", async () => {
    const config = createTestConfig();
    const baseJob = createBaseJob(config);

    const dynamoSend = vi
      .fn()
      .mockResolvedValueOnce({ Item: baseJob })
      .mockResolvedValueOnce({});

    const s3Send = vi.fn().mockResolvedValue({});

    const deps: JobsDeps = {
      dynamo: createStubDynamo(dynamoSend),
      s3: createStubS3(s3Send),
      stepFunctions: createStubSFN(vi.fn()),
      config,
    };

    const result = await uploadTranscriptForJob(deps, baseJob.jobId, {
      transcriptText: "Hello world transcript.",
      subtitlesVtt: "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello",
    });

    expect(result.ok).toBe(true);
    expect(result.jobId).toBe("job-123");
    expect(result.transcriptKey).toBe("derived/job-123/transcript.json");
    expect(result.subtitlesKey).toBe("derived/job-123/subtitles.vtt");

    expect(s3Send).toHaveBeenCalledTimes(2);

    const transcriptPut = s3Send.mock.calls[0][0];
    expect(transcriptPut.input.Bucket).toBe(config.DERIVED_BUCKET);
    expect(transcriptPut.input.Key).toBe("derived/job-123/transcript.json");
    expect(transcriptPut.input.ContentType).toBe("application/json");
    const transcriptBody =
      typeof transcriptPut.input.Body === "string"
        ? transcriptPut.input.Body
        : Buffer.from(transcriptPut.input.Body as ArrayBuffer).toString("utf-8");
    const transcriptJson = JSON.parse(transcriptBody);
    expect(transcriptJson.source).toBe("user");
    expect(transcriptJson.text).toBe("Hello world transcript.");
    expect(transcriptJson.schema_version).toBe("1.0");

    const subtitlesPut = s3Send.mock.calls[1][0];
    expect(subtitlesPut.input.Bucket).toBe(config.DERIVED_BUCKET);
    expect(subtitlesPut.input.Key).toBe("derived/job-123/subtitles.vtt");
    expect(subtitlesPut.input.ContentType).toBe("text/vtt");

    expect(dynamoSend).toHaveBeenCalledTimes(2);
    const updateCommand = dynamoSend.mock.calls[1][0];
    expect(updateCommand.input.UpdateExpression).toContain(
      "#subtitlesKey = :subtitlesKey"
    );
    expect(updateCommand.input.ExpressionAttributeValues[":subtitlesKey"]).toBe(
      "derived/job-123/subtitles.vtt"
    );
  });

  it("writes only transcript when no subtitles and REMOVEs subtitlesKey in Dynamo", async () => {
    const config = createTestConfig();
    const baseJob = createBaseJob(config);

    const dynamoSend = vi
      .fn()
      .mockResolvedValueOnce({ Item: baseJob })
      .mockResolvedValueOnce({});

    const s3Send = vi.fn().mockResolvedValue({});

    const deps: JobsDeps = {
      dynamo: createStubDynamo(dynamoSend),
      s3: createStubS3(s3Send),
      stepFunctions: createStubSFN(vi.fn()),
      config,
    };

    const result = await uploadTranscriptForJob(deps, baseJob.jobId, {
      transcriptText: "Transcript only.",
    });

    expect(result.ok).toBe(true);
    expect(result.jobId).toBe("job-123");
    expect(result.transcriptKey).toBe("derived/job-123/transcript.json");
    expect(result).not.toHaveProperty("subtitlesKey");

    expect(s3Send).toHaveBeenCalledTimes(1);
    const transcriptPut = s3Send.mock.calls[0][0];
    expect(transcriptPut.input.Key).toBe("derived/job-123/transcript.json");

    expect(dynamoSend).toHaveBeenCalledTimes(2);
    const updateCommand = dynamoSend.mock.calls[1][0];
    expect(updateCommand.input.UpdateExpression).toContain("REMOVE #subtitlesKey");
    expect(updateCommand.input.ExpressionAttributeValues).not.toHaveProperty(
      ":subtitlesKey"
    );
  });
});
