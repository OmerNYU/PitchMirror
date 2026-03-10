import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { ApiError, ErrorCodes } from "../errors.js";
import { nowIso } from "../util/time.js";

export interface TranscriptPayload {
  schema_version: string;
  generatedAt: string;
  source: string;
  text: string;
}

export async function writeTranscriptArtifacts(
  s3: S3Client,
  bucket: string,
  transcriptKey: string,
  transcriptPayload: TranscriptPayload,
  subtitlesKey?: string,
  subtitlesVtt?: string
): Promise<void> {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: transcriptKey,
        ContentType: "application/json",
        Body: JSON.stringify(transcriptPayload),
      })
    );

    if (subtitlesKey != null && subtitlesVtt != null && subtitlesVtt.trim() !== "") {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: subtitlesKey,
          ContentType: "text/vtt",
          Body: subtitlesVtt,
        })
      );
    }
  } catch (err) {
    throw new ApiError(
      502,
      ErrorCodes.S3_ACCESS_ERROR,
      "Failed to write transcript artifacts",
      err
    );
  }
}

export function buildTranscriptPayload(transcriptText: string): TranscriptPayload {
  return {
    schema_version: "1.0",
    generatedAt: nowIso(),
    source: "user",
    text: transcriptText,
  };
}
