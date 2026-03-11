const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "http://localhost:8080";

export type Mode = "voice" | "presence" | "full";
export type Tier = "free" | "pro" | "max";

export interface CreateJobResponse {
  jobId: string;
  status: "CREATED" | "UPLOADED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "PARTIAL" | "EXPIRED";
  stage:
    | "UPLOAD"
    | "VALIDATE"
    | "AUDIO"
    | "TRANSCRIBE"
    | "KEYFRAMES"
    | "METRICS"
    | "NOVA"
    | "FINALIZE";
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

export interface FinalizeJobResponse {
  ok: boolean;
  jobId: string;
  status: CreateJobResponse["status"];
  stage: CreateJobResponse["stage"];
  pipelineStart: "started" | "already_running" | "failed";
  requestId: string;
  executionArn?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: CreateJobResponse["status"];
  stage: CreateJobResponse["stage"];
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
}

export interface ReportSection {
  score?: number;
  highlights?: string[];
  improvements?: string[];
  notes?: string;
  // Allow Nova to add additional fields without breaking the client
  [key: string]: unknown;
}

export interface ReportPracticePlanItem {
  session: number;
  minutes: number;
  focus: string;
  steps: string[];
}

export interface Report {
  schema_version?: string;
  generatedAt?: string;
  overall: {
    score: number;
    summary: string;
  };
  top_fixes: {
    issue: string;
    why: string;
    drill: string;
    expected_gain: string;
  }[];
  voice: ReportSection;
  presence: ReportSection;
  content: ReportSection;
  practice_plan: ReportPracticePlanItem[];
  limitations: string[];
  artifacts: {
    raw: { bucket: string; key: string };
    report: { bucket: string; key: string };
    [key: string]: unknown;
  };
  note?: string;
}

export interface UploadTranscriptInput {
  transcriptText: string;
  subtitlesVtt?: string;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  requestId?: string;
  httpStatus: number;
}

async function parseError(res: Response): Promise<never> {
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    // ignore
  }

  const err = payload?.error;

  const error: ApiErrorShape = {
    code: err?.code ?? "HTTP_ERROR",
    message:
      err?.message ??
      (res.status === 0
        ? "Network error"
        : `Request failed with status ${res.status}`),
    requestId: err?.requestId,
    httpStatus: res.status,
  };

  throw error;
}

export async function createJob(params: {
  mode: Mode;
  tier: Tier;
  consent: boolean;
  contentType: string;
}): Promise<CreateJobResponse> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    await parseError(res);
  }

  return (await res.json()) as CreateJobResponse;
}

export async function uploadToPresignedUrl(args: {
  url: string;
  file: File;
  contentType: string;
}): Promise<void> {
  const res = await fetch(args.url, {
    method: "PUT",
    headers: {
      "Content-Type": args.contentType,
    },
    body: args.file,
  });

  if (!res.ok) {
    await parseError(res);
  }
}

export async function finalizeJob(args: {
  jobId: string;
  rawKey: string;
}): Promise<FinalizeJobResponse> {
  const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(args.jobId)}/finalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rawKey: args.rawKey }),
  });

  if (!res.ok) {
    await parseError(res);
  }

  return (await res.json()) as FinalizeJobResponse;
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobId)}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    await parseError(res);
  }

  return (await res.json()) as JobStatusResponse;
}

export async function getReport(jobId: string): Promise<Report> {
  const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobId)}/report`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    await parseError(res);
  }

  return (await res.json()) as Report;
}

export async function uploadTranscript(
  jobId: string,
  input: UploadTranscriptInput,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/jobs/${encodeURIComponent(jobId)}/transcript`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!res.ok) {
    await parseError(res);
  }
}

