import type { ZodType } from 'zod';

/** The thrown `ZodError` becomes a 400 in `errorHandler`. */
export function validateQuery<T>(schema: ZodType<T>, query: unknown): T {
  return schema.parse(query);
}
