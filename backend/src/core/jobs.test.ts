import { describe, it, expect, vi } from "vitest";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { S3Client } from "@aws-sdk/client-s3";
import type { SFNClient } from "@aws-sdk/client-sfn";
import type { JobRecord } from "../types.js";
import type { Config } from "../config.js";

vi.mock("../services/pipeline.js", () => ({
  startStubPipeline: vi.fn(),
}));

import { finalizeJob, type JobsDeps } from "./jobs.js";
import { startStubPipeline } from "../services/pipeline.js";

const mockedStartStubPipeline =
  startStubPipeline as unknown as ReturnType<typeof vi.fn>;

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

describe("finalizeJob - pipeline failure handling", () => {
  it("marks job FAILED when pipeline start fails and conditional update succeeds", async () => {
    const config = createTestConfig();
    const baseJob = createBaseJob(config);

    const dynamoSend = vi
      .fn()
      // GetCommand
      .mockResolvedValueOnce({ Item: baseJob })
      // First UpdateCommand (mark UPLOADED / VALIDATE)
      .mockResolvedValueOnce({})
      // Second UpdateCommand (mark FAILED)
      .mockResolvedValueOnce({});

    const s3Send = vi.fn().mockResolvedValue({
      ContentLength: baseJob.maxBytes - 1,
      ContentType: baseJob.expectedContentType,
      ETag: "etag-value",
    });

    const sfnSend = vi.fn();

    const deps: JobsDeps = {
      dynamo: createStubDynamo(dynamoSend),
      s3: createStubS3(s3Send),
      stepFunctions: createStubSFN(sfnSend),
      config,
    };

    mockedStartStubPipeline.mockResolvedValueOnce({
      pipelineStart: "failed",
      errorCode: "PIPELINE_ERROR",
      errorMessage: "stub failure",
    });

    const result = await finalizeJob(deps, baseJob.jobId, {
      rawKey: baseJob.rawKey,
    }, "req-123");

    expect(result.status).toBe("FAILED");
    expect(result.pipelineStart).toBe("failed");
    expect(result.errorCode).toBe("PIPELINE_ERROR");
    expect(result.errorMessage).toBe("stub failure");

    // Third Dynamo send call should be the FAILED update with safe condition
    expect(dynamoSend).toHaveBeenCalledTimes(3);
    const failedUpdateCommand = dynamoSend.mock.calls[2][0] as {
      input?: { ConditionExpression?: string };
    };
    const condition = failedUpdateCommand.input?.ConditionExpression ?? "";
    expect(condition).toContain("#stage = :expectedStage");
    expect(condition).toContain("#status <> :succeeded");
  });

  it("does not overwrite SUCCEEDED jobs when conditional update fails", async () => {
    const config = createTestConfig();
    const baseJob = createBaseJob(config);

    const conditionalError = { name: "ConditionalCheckFailedException" } as Error;

    const dynamoSend = vi
      .fn()
      // GetCommand
      .mockResolvedValueOnce({ Item: baseJob })
      // First UpdateCommand (mark UPLOADED / VALIDATE)
      .mockResolvedValueOnce({})
      // Second UpdateCommand (FAILED) throws conditional failure
      .mockRejectedValueOnce(conditionalError);

    const s3Send = vi.fn().mockResolvedValue({
      ContentLength: baseJob.maxBytes - 1,
      ContentType: baseJob.expectedContentType,
      ETag: "etag-value",
    });

    const sfnSend = vi.fn();

    const deps: JobsDeps = {
      dynamo: createStubDynamo(dynamoSend),
      s3: createStubS3(s3Send),
      stepFunctions: createStubSFN(sfnSend),
      config,
    };

    mockedStartStubPipeline.mockResolvedValueOnce({
      pipelineStart: "failed",
      errorCode: "PIPELINE_ERROR",
      errorMessage: "stub failure",
    });

    const result = await finalizeJob(deps, baseJob.jobId, {
      rawKey: baseJob.rawKey,
    }, "req-456");

    // ConditionalCheckFailedException should be swallowed
    expect(result.status).toBe("UPLOADED");
    expect(result.pipelineStart).toBe("failed");
    expect(result.errorCode).toBe("PIPELINE_ERROR");
    expect(result.errorMessage).toBe("stub failure");

    expect(dynamoSend).toHaveBeenCalledTimes(3);
    const failedUpdateCommand = dynamoSend.mock.calls[2][0] as {
      input?: { ConditionExpression?: string };
    };
    const condition = failedUpdateCommand.input?.ConditionExpression ?? "";
    expect(condition).toContain("#stage = :expectedStage");
    expect(condition).toContain("#status <> :succeeded");
  });
});

