import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import type { Mode, Tier } from "../types.js";

export interface StartStubPipelineParams {
  jobId: string;
  rawBucket: string;
  rawKey: string;
  derivedBucket: string;
  reportKey: string;
  mode: Mode;
  tier: Tier;
  /** Pass empty string when absent so Step Functions always receives the key */
  transcriptKey?: string;
  /** Pass empty string when absent so Step Functions always receives the key */
  subtitlesKey?: string;
}

export type PipelineStartResult =
  | { pipelineStart: "started"; executionArn: string }
  | { pipelineStart: "already_running"; executionArn?: string }
  | { pipelineStart: "failed"; errorCode: string; errorMessage: string };

function isExecutionAlreadyExists(err: unknown): boolean {
  const e = err as { name?: string; message?: string; Code?: string };
  return (
    e?.name === "ExecutionAlreadyExists" ||
    e?.name === "ExecutionAlreadyExistsException" ||
    (typeof e?.message === "string" && e.message.includes("ExecutionAlreadyExists")) ||
    e?.Code === "ExecutionAlreadyExists"
  );
}

export async function startStubPipeline(
  client: SFNClient,
  stateMachineArn: string,
  params: StartStubPipelineParams
): Promise<PipelineStartResult> {
  const input = JSON.stringify({
    jobId: params.jobId,
    rawBucket: params.rawBucket,
    rawKey: params.rawKey,
    derivedBucket: params.derivedBucket,
    reportKey: params.reportKey,
    mode: params.mode,
    tier: params.tier,
    transcriptKey: params.transcriptKey ?? "",
    subtitlesKey: params.subtitlesKey ?? "",
  });

  try {
    const response = await client.send(
      new StartExecutionCommand({
        stateMachineArn,
        name: params.jobId,
        input,
      })
    );

    return {
      pipelineStart: "started",
      executionArn: response.executionArn ?? "",
    };
  } catch (err) {
    if (isExecutionAlreadyExists(err)) {
      return { pipelineStart: "already_running" };
    }

    const e = err as { name?: string; message?: string };
    return {
      pipelineStart: "failed",
      errorCode: e?.name ?? "Unknown",
      errorMessage: e?.message ?? "Unknown error",
    };
  }
}
