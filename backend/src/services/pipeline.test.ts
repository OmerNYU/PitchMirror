import { describe, it, expect, beforeEach } from "vitest";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { mockClient } from "aws-sdk-client-mock";
import {
  startStubPipeline,
  type StartStubPipelineParams,
} from "./pipeline.js";

const sfnMock = mockClient(SFNClient);

const baseParams: StartStubPipelineParams = {
  jobId: "job-123",
  rawBucket: "raw-bucket",
  rawKey: "raw/job-123/input.mp4",
  derivedBucket: "derived-bucket",
  reportKey: "derived/job-123/report.json",
  mode: "voice",
  tier: "free",
};

describe("startStubPipeline", () => {
  beforeEach(() => {
    sfnMock.reset();
  });

  it("returns started on successful StartExecution", async () => {
    sfnMock.on(StartExecutionCommand).resolves({
      executionArn: "arn:aws:states:us-east-1:123456789012:execution:stub:job-123",
    });

    const client = new SFNClient({ region: "us-east-1" });

    const result = await startStubPipeline(
      client,
      "arn:aws:states:us-east-1:123456789012:stateMachine:stub",
      baseParams
    );

    expect(result).toEqual({
      pipelineStart: "started",
      executionArn:
        "arn:aws:states:us-east-1:123456789012:execution:stub:job-123",
    });
  });

  it("returns already_running when ExecutionAlreadyExists is thrown", async () => {
    const err = new Error("ExecutionAlreadyExists: execution already exists");
    err.name = "ExecutionAlreadyExists";

    sfnMock.on(StartExecutionCommand).rejects(err as Error);

    const client = new SFNClient({ region: "us-east-1" });

    const result = await startStubPipeline(
      client,
      "arn:aws:states:us-east-1:123456789012:stateMachine:stub",
      baseParams
    );

    expect(result).toEqual({
      pipelineStart: "already_running",
    });
  });

  it("maps generic errors to failed with code and message", async () => {
    const err = new Error("Access denied to StartExecution");
    err.name = "AccessDeniedException";

    sfnMock.on(StartExecutionCommand).rejects(err as Error);

    const client = new SFNClient({ region: "us-east-1" });

    const result = await startStubPipeline(
      client,
      "arn:aws:states:us-east-1:123456789012:stateMachine:stub",
      baseParams
    );

    expect(result).toEqual({
      pipelineStart: "failed",
      errorCode: "AccessDeniedException",
      errorMessage: "Access denied to StartExecution",
    });
  });

  it("serializes transcriptKey and subtitlesKey into input (empty string when absent)", async () => {
    let capturedInput: string | undefined;
    sfnMock.on(StartExecutionCommand).callsFake((args) => {
      capturedInput = args.input as string;
      return Promise.resolve({
        executionArn: "arn:aws:states:us-east-1:123456789012:execution:stub:job-123",
      });
    });

    const client = new SFNClient({ region: "us-east-1" });

    await startStubPipeline(
      client,
      "arn:aws:states:us-east-1:123456789012:stateMachine:stub",
      baseParams
    );

    const parsed = JSON.parse(capturedInput!);
    expect(parsed.transcriptKey).toBe("");
    expect(parsed.subtitlesKey).toBe("");
  });

  it("serializes provided transcriptKey and subtitlesKey into input", async () => {
    let capturedInput: string | undefined;
    sfnMock.on(StartExecutionCommand).callsFake((args) => {
      capturedInput = args.input as string;
      return Promise.resolve({
        executionArn: "arn:aws:states:us-east-1:123456789012:execution:stub:job-123",
      });
    });

    const client = new SFNClient({ region: "us-east-1" });

    await startStubPipeline(
      client,
      "arn:aws:states:us-east-1:123456789012:stateMachine:stub",
      {
        ...baseParams,
        transcriptKey: "derived/job-123/transcript.json",
        subtitlesKey: "derived/job-123/subtitles.vtt",
      }
    );

    const parsed = JSON.parse(capturedInput!);
    expect(parsed.transcriptKey).toBe("derived/job-123/transcript.json");
    expect(parsed.subtitlesKey).toBe("derived/job-123/subtitles.vtt");
  });
});

