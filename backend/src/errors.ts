import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export const ErrorCodes = {
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_MODE: "INVALID_MODE",
  INVALID_TIER: "INVALID_TIER",
  INVALID_CONTENT_TYPE: "INVALID_CONTENT_TYPE",
  CONSENT_REQUIRED: "CONSENT_REQUIRED",
  INPUT_TOO_LARGE: "INPUT_TOO_LARGE",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class ApiError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const requestId = request.id ?? "unknown";

  if (error instanceof ApiError) {
    reply.status(error.httpStatus).send({
      error: {
        code: error.code,
        message: error.message,
        requestId,
      },
    });
    return;
  }

  reply.status(500).send({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error",
      requestId,
    },
  });
}
