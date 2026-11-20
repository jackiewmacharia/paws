import { z } from 'zod';

/**
 * Must exceed paws-api's own worst case: some routes (spotlights, of-the-day,
 * showdown) make two sequential upstream calls with an 8s timeout each.
 */
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;

export interface McpConfig {
  pawsApiUrl: string;
  requestTimeoutMs: number;
}

/** An empty value (e.g. `PAWS_API_URL=` in an MCP client's env block) means "unset". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema);

/** `z.string().url()` alone accepts `localhost:3000` (scheme "localhost:"), so require http(s). */
const httpUrl = z.string().regex(/^https?:\/\/[^/]/, 'must be an http(s) URL, e.g. http://localhost:3000');

const EnvSchema = z.object({
  PAWS_API_URL: optional(httpUrl.default('http://localhost:3000')),
  PAWS_API_REQUEST_TIMEOUT_MS: optional(z.coerce.number().int().positive().default(DEFAULT_REQUEST_TIMEOUT_MS)),
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration — ${problems.join('; ')}`);
  }
  return {
    pawsApiUrl: parsed.data.PAWS_API_URL.replace(/\/+$/, ''),
    requestTimeoutMs: parsed.data.PAWS_API_REQUEST_TIMEOUT_MS,
  };
}
