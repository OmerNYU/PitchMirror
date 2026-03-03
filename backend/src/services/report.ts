import { GetObjectCommand, NotFound } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
import { ApiError, ErrorCodes } from "../errors.js";

const ReportFixSchema = z.object({
  issue: z.string(),
  why: z.string(),
  drill: z.string(),
  expected_gain: z.string(),
});

export const ReportSchema = z.object({
  overall: z.object({
    score: z.number(),
    summary: z.string(),
  }),
  top_fixes: z.array(ReportFixSchema),
  voice: z.record(z.unknown()),
  presence: z.record(z.unknown()),
  content: z.record(z.unknown()),
  artifacts: z.record(z.unknown()).optional(),
  note: z.string().optional(),
});

export type Report = z.infer<typeof ReportSchema>;

async function bodyToString(body: unknown): Promise<string> {
  const b: any = body;
  if (b && typeof b.transformToString === "function") {
    return b.transformToString();
  }

  if (b instanceof Uint8Array) {
    return new TextDecoder("utf-8").decode(b);
  }

  return await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    b.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    b.on("error", (err: Error) => {
      reject(err);
    });
    b.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
  });
}

export async function getReport(
  s3: S3Client,
  bucket: string,
  key: string
): Promise<Report> {
  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!res.Body) {
      throw new ApiError(
        502,
        ErrorCodes.S3_ACCESS_ERROR,
        "Empty report body from storage"
      );
    }

    const jsonString = await bodyToString(res.Body);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonString);
    } catch (err) {
      throw new ApiError(
        502,
        ErrorCodes.S3_ACCESS_ERROR,
        "Invalid report JSON",
        err
      );
    }

    const result = ReportSchema.safeParse(parsedJson);
    if (!result.success) {
      throw new ApiError(
        502,
        ErrorCodes.S3_ACCESS_ERROR,
        "Invalid report format",
        result.error.flatten()
      );
    }

    return result.data;
  } catch (err) {
    if (err instanceof NotFound) {
      throw new ApiError(404, ErrorCodes.NOT_FOUND, "Report not found");
    }

    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(
      502,
      ErrorCodes.S3_ACCESS_ERROR,
      "Failed to fetch report",
      err
    );
  }
}

