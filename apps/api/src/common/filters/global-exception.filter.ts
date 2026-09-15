import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';

interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Catches all exceptions and normalises them into a consistent JSON response.
 * Internal error details are never exposed in production.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        const rawMessage = obj['message'];

        if (Array.isArray(rawMessage)) {
          message = 'Dados inválidos';
          errors = { validation: rawMessage as string[] };
        } else if (typeof rawMessage === 'string') {
          message = rawMessage;
        }
      }
    } else if (exception instanceof Error) {
      if (process.env['NODE_ENV'] !== 'production') {
        message = exception.message;
      }
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        `${request.method} ${request.url}`,
      );
    }

    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} — ${request.method} ${request.url}`,
      );
    }

    const body: ErrorResponseBody = {
      success: false,
      statusCode: status,
      message,
      ...(errors && { errors }),
    };

    response.status(status).json(body);
  }
}
