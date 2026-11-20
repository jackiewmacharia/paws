import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../errors/http-error';

interface ErrorBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, `Cannot ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  exception: unknown,
  request: Request,
  response: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const status = getStatus(exception);
  const message = getMessage(exception);

  const body: ErrorBody = {
    statusCode: status,
    timestamp: new Date().toISOString(),
    path: request.originalUrl,
    message,
  };

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(`[${request.method} ${request.originalUrl}]`, exception);
  }

  response.status(status).json(body);
}

function getStatus(exception: unknown): number {
  if (exception instanceof HttpError) {
    return exception.status;
  }
  if (exception instanceof ZodError) {
    return 400;
  }
  return 500;
}

function getMessage(exception: unknown): string | string[] {
  if (exception instanceof HttpError) {
    return exception.message;
  }
  if (exception instanceof ZodError) {
    return exception.issues.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`);
  }
  return 'Internal server error';
}
