import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger = new Logger(AllExceptionsFilter.name);

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const status =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR;

		const message =
			exception instanceof HttpException
				? exception.message
				: 'Internal server error';

		const errorResponse = {
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			message,
		};

		if (status >= 500) {
			this.logger.error(
				`Error ${status}: ${message}`,
				exception instanceof Error ? exception.stack : undefined,
			);
		} else {
			this.logger.warn(`Warning ${status}: ${message}`);
		}

		this.logger.debug(exception);
		response.status(status).json(errorResponse);
	}
}
