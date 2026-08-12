import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        code = (resp.code as string) || `HTTP_${status}`;
      }

      if (status === HttpStatus.NOT_FOUND) code = 'NOT_FOUND';
      else if (status === HttpStatus.FORBIDDEN) code = 'FORBIDDEN';
      else if (status === HttpStatus.UNAUTHORIZED) code = 'UNAUTHORIZED';
      else if (status === HttpStatus.BAD_REQUEST) code = 'BAD_REQUEST';
      else if (status === HttpStatus.CONFLICT) code = 'CONFLICT';
      else if (status === HttpStatus.TOO_MANY_REQUESTS) code = 'RATE_LIMITED';
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    const responseBody = {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }
}

