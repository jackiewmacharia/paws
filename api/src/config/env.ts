import { z } from 'zod';

export interface UpstreamApiConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface AppConfig {
  port: number;
  catApi: UpstreamApiConfig;
  dogApi: UpstreamApiConfig;
}

/** `.env.template` ships lines like `export CAT_API_KEY=`, so an empty value means "unset". */
const unsetIfEmpty = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(unsetIfEmpty, schema);

/** `z.string().url()` alone accepts `localhost:9000` (scheme "localhost:"), so require http(s). */
const httpUrl = z.string().regex(/^https?:\/\/[^/]/, 'must be an http(s) URL');

const EnvSchema = z.object({
  PORT: optional(z.coerce.number().int().min(1).max(65_535).default(3000)),
  CAT_API_BASE_URL: optional(httpUrl.default('https://api.thecatapi.com/v1')),
  DOG_API_BASE_URL: optional(httpUrl.default('https://api.thedogapi.com/v1')),
  CAT_API_KEY: optional(z.string().optional()),
  DOG_API_KEY: optional(z.string().optional()),
});

/**
 * Reads and validates process env into a typed config object, failing fast
 * at startup (naming the bad variable) instead of on the first request.
 * TheCatAPI works key-less at a lower rate limit; TheDogAPI rejects most
 * key-less requests. Either way a missing key is a warning, not a failure.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration — ${problems.join('; ')}`);
  }
  const vars = parsed.data;

  if (!vars.CAT_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn('CAT_API_KEY is not set — TheCatAPI requests will use the anonymous rate limit.');
  }
  if (!vars.DOG_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn('DOG_API_KEY is not set — TheDogAPI rejects most requests without one.');
  }

  return {
    port: vars.PORT,
    catApi: { baseUrl: vars.CAT_API_BASE_URL, apiKey: vars.CAT_API_KEY },
    dogApi: { baseUrl: vars.DOG_API_BASE_URL, apiKey: vars.DOG_API_KEY },
  };
}
