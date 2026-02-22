import { HeadObjectCommand, NotFound } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { ApiError, ErrorCodes } from "../errors.js";

export interface HeadObjectResult {
  contentLength: number;
  contentType: string | undefined;
  etag: string | undefined;
}

export async function headObject(
  client: S3Client,
  bucket: string,
  key: string
): Promise<HeadObjectResult> {
  try {
    const response = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key })
    );
    return {
      contentLength: response.ContentLength ?? 0,
      contentType: response.ContentType,
      etag: response.ETag,
    };
  } catch (err: unknown) {
    if (err instanceof NotFound) {
      throw new ApiError(404, ErrorCodes.NOT_FOUND, "Object not found");
    }
    throw new ApiError(
      500,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to verify upload",
      err
    );
  }
}
