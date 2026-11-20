import type { ZodType } from 'zod';

/**
 * Parses and validates an Express `req.query` object against a zod schema.
 * Throws a `ZodError`, which `errorHandler` (common/middleware/error-handler.ts) turns into a 400
 * with a field-by-field message list.
 */
export function validateQuery<T>(schema: ZodType<T>, query: unknown): T {
  return schema.parse(query);
}
