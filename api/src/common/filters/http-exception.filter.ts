import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
} from '@nestjs/common';

interface HttpExceptionBody {
	message?: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();
		const request = ctx.getRequest();

		const isHttp = exception instanceof HttpException;
		const status = isHttp
			? exception.getStatus()
			: HttpStatus.INTERNAL_SERVER_ERROR;

		const body = isHttp ? (exception.getResponse() as HttpExceptionBody | string) : null;
		const message =
			typeof body === 'string'
				? body
				: (body?.message ?? 'Internal Service Error');

		if (!isHttp) this.logger.error(exception);

		response.status(status).json({
			success: false,
			statusCode: status,
			message,
			error: isHttp ? exception.name : 'InternalServerError',
			path: request.url,
			timestamp: new Date().toISOString(),
		});
	}
}
