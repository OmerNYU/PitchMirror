import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3Client } from "@aws-sdk/client-s3";

export async function createPresignedPutUrl(
  client: S3Client,
  bucket: string,
  key: string,
  contentType: string,
  expiresSeconds: number
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, {
    expiresIn: expiresSeconds,
    signableHeaders: new Set(["content-type"]),
  });
}
