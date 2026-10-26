import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";

@Catch()
export class HttpErrorExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): any {
    const ctx = host.switchToHttp();
    let response;
    try {
      response = ctx.getResponse();
    } catch (error) {
      return;
    }
    if (!response || typeof response.status !== "function") {
      return;
    }
    const request = ctx.getRequest() || {};

    const status = exception.getStatus ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawMessage = exception.message as { error?: string } | string;
    const resolvedMessage = rawMessage && typeof rawMessage === "object"
      ? (rawMessage.error || rawMessage)
      : rawMessage;
    // Nest 12 renamed the guard-rejection string and the unmatched-route string.
    // Map them back so existing clients still see the previous bodies.
    let message = (status !== HttpStatus.INTERNAL_SERVER_ERROR) ? (resolvedMessage || null) : "Internal Server Error";
    if (message === "Forbidden resource") {
      message = "Forbidden";
    } else if (typeof message === "string" && /^Cannot [A-Z]+ /.test(message)) {
      message = "Not Found";
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      Logger.error(
        `${request.method} ${request.url}`,
        JSON.stringify(exception),
        `ExceptionFilter`
      );
    }

    const errorResponse = {
      code: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message
    };

    Logger.error(
      `${request.method} ${request.url}`,
      JSON.stringify(errorResponse),
      `ExceptionFilter`
    );

    response.status(status).json(errorResponse);
  }
}
