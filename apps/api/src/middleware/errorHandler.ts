import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public fields?: Record<string, string[]>;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', fields?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || undefined;

  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || 'root';
      if (!fields[path]) {
        fields[path] = [];
      }
      fields[path].push(issue.message);
    }

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The submitted data was invalid.',
        fields,
        requestId
      }
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        fields: err.fields,
        requestId
      }
    });
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled application error');

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.',
      requestId
    }
  });
}

