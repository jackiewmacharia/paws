import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { PawsApiError } from '../client/paws-api-client.js';

export function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function errorResult(err: unknown): CallToolResult {
  const message =
    err instanceof PawsApiError
      ? `paws-api error (${err.status}): ${err.message}`
      : err instanceof Error
        ? err.message
        : String(err);
  return { content: [{ type: 'text', text: message }], isError: true };
}

export function withErrorHandling(
  handler: () => Promise<unknown>,
): Promise<CallToolResult> {
  return handler().then(jsonResult).catch(errorResult);
}
