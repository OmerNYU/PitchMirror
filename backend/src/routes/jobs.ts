import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { config } from "../config.js";
import {
  createS3Client,
  createDynamoDocClient,
  createStepFunctionsClient,
} from "../aws/clients.js";
import {
  createJob,
  finalizeJob,
  getJobStatus,
  type JobsDeps,
  type CreateJobInput,
  type FinalizeJobInput,
} from "../core/jobs.js";
import { ApiError, ErrorCodes } from "../errors.js";
import type { Mode, Tier, AllowedContentType } from "../types.js";

const CreateJobSchema = z.object({
  mode: z.enum(["voice", "presence", "full"] as const),
  tier: z.enum(["free", "pro", "max"] as const),
  consent: z.boolean(),
  contentType: z.enum([
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ] as const),
});

const FinalizeJobSchema = z.object({
  rawKey: z.string().min(1),
});

const JobIdParamSchema = z.object({
  jobId: z.string().min(1),
});

function buildDeps(): JobsDeps {
  return {
    dynamo: createDynamoDocClient(config),
    s3: createS3Client(config),
    stepFunctions: createStepFunctionsClient(config),
    config,
  };
}

export async function registerJobsRoutes(app: FastifyInstance): Promise<void> {
  const deps = buildDeps();

  app.post("/jobs", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateJobSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        ErrorCodes.INVALID_REQUEST,
        parsed.error.message,
        parsed.error.flatten()
      );
    }
    const body = parsed.data;
    const input: CreateJobInput = {
      mode: body.mode as Mode,
      tier: body.tier as Tier,
      consent: body.consent,
      contentType: body.contentType as AllowedContentType,
    };
    const result = await createJob(deps, input);
    return reply.status(200).send(result);
  });

  app.post(
    "/jobs/:jobId/finalize",
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const paramsResult = JobIdParamSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ApiError(
          400,
          ErrorCodes.INVALID_REQUEST,
          "Invalid jobId",
          paramsResult.error.flatten()
        );
      }
      const bodyResult = FinalizeJobSchema.safeParse(request.body);
      if (!bodyResult.success) {
        throw new ApiError(
          400,
          ErrorCodes.INVALID_REQUEST,
          bodyResult.error.message,
          bodyResult.error.flatten()
        );
      }
      const result = await finalizeJob(
        deps,
        paramsResult.data.jobId,
        { rawKey: bodyResult.data.rawKey } as FinalizeJobInput,
        request.id ?? "unknown"
      );
      return reply.status(200).send(result);
    }
  );

  app.get(
    "/jobs/:jobId",
    async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const paramsResult = JobIdParamSchema.safeParse(request.params);
      if (!paramsResult.success) {
        throw new ApiError(
          400,
          ErrorCodes.INVALID_REQUEST,
          "Invalid jobId",
          paramsResult.error.flatten()
        );
      }
      const result = await getJobStatus(deps, paramsResult.data.jobId);
      return reply.status(200).send(result);
    }
  );

  app.get("/health", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ ok: true });
  });
}
