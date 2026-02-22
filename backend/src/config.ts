import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  AWS_REGION: z.string().min(1),
  RAW_BUCKET: z.string().min(1),
  DERIVED_BUCKET: z.string().min(1),
  JOBS_TABLE: z.string().min(1),
  PRESIGN_EXPIRES_SECONDS: z.coerce.number().int().positive(),
  RAW_TTL_DAYS: z.coerce.number().int().positive(),
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().int().min(1).max(65535),
  ALLOWED_ORIGINS: z.string().default("*"),
});

export type Config = z.infer<typeof envSchema>;

function loadConfig(): Config {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid env: ${JSON.stringify(msg)}`);
  }
  return parsed.data;
}

export const config = loadConfig();
