import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
	statusCode: number;
	timestamp: string;
	path: string;
	message: string | string[];
	error?: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);

	catch(exception: HttpException, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();
		const status = exception.getStatus();
		const exceptionResponse = exception.getResponse();

		const errorResponse: ErrorResponse = {
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			message: this.extractMessage(
				exceptionResponse as string | Record<string, unknown>,
			),
		};

		if (
			typeof exceptionResponse === 'object' &&
			'error' in exceptionResponse
		) {
			errorResponse.error = exceptionResponse.error as string;
		}

		this.logger.error(
			`HTTP ${status} Error: ${JSON.stringify(errorResponse)}`,
			exception.stack,
		);

		response.status(status).json(errorResponse);
	}

	private extractMessage(
		exceptionResponse: string | Record<string, unknown>,
	): string | string[] {
		if (typeof exceptionResponse === 'string') {
			return exceptionResponse;
		}

		if ('message' in exceptionResponse) {
			return exceptionResponse.message as string | string[];
		}

		return 'Internal server error';
	}
}
