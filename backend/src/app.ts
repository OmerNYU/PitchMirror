import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { errorHandler } from "./errors.js";
import { registerJobsRoutes } from "./routes/jobs.js";
import { logRequest } from "./util/log.js";
import { randomUUID } from "node:crypto";

export async function buildApp() {
  const app = Fastify({
    genReqId: () => randomUUID(),
  });

  await app.register(cors, {
    origin: config.ALLOWED_ORIGINS,
  });

  app.setErrorHandler(errorHandler);

  app.addHook("onResponse", (request, reply, done) => {
    logRequest(
      request.method,
      request.url,
      reply.statusCode,
      request.id ?? "unknown"
    );
    done();
  });

  await registerJobsRoutes(app);

  return app;
}
