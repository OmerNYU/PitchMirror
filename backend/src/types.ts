// Status and stage from spec
export type Status =
  | "CREATED"
  | "UPLOADED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "PARTIAL"
  | "EXPIRED";

export type Stage =
  | "UPLOAD"
  | "VALIDATE"
  | "AUDIO"
  | "TRANSCRIBE"
  | "KEYFRAMES"
  | "METRICS"
  | "NOVA"
  | "FINALIZE";

export type Mode = "voice" | "presence" | "full";
export type Tier = "free" | "pro" | "max";

export const TIER_MAX_BYTES: Record<Tier, number> = {
  free: 80 * 1024 * 1024,
  pro: 200 * 1024 * 1024,
  max: 500 * 1024 * 1024,
};

export const CONTENT_TYPE_EXT: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
} as const;

export const ALLOWED_CONTENT_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

export interface JobError {
  code: string;
  message: string;
}

export interface JobRecord {
  jobId: string;
  status: Status;
  stage: Stage;
  mode: Mode;
  tier: Tier;
  consent: boolean;
  createdAt: string;
  updatedAt: string;
  ttl: number;
  rawBucket: string;
  rawKey: string;
  expectedContentType: string;
  maxBytes: number;
  // Set on finalize (from S3 HeadObject)
  sizeBytes?: number;
  contentType?: string;
  etag?: string;
  uploadedAt?: string;
  error?: JobError;
  artifacts?: Record<string, unknown>;
}
