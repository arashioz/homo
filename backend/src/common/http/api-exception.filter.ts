import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";

type ExceptionResponse = string | { message?: string | string[]; error?: string };

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? (exception.getResponse() as ExceptionResponse)
      : "خطای داخلی سرور";
    const messages =
      typeof exceptionResponse === "string"
        ? [exceptionResponse]
        : Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message
          : [exceptionResponse.message || "خطا"];

    response.status(status).json({
      success: false,
      message: messages[0],
      code: isHttpException ? "HTTP_ERROR" : "INTERNAL_ERROR",
      errors: messages,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
