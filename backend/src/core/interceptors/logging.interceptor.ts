import {
	CallHandler,
	ExecutionContext,
	HttpException,
	Injectable,
	Logger,
	NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger('HTTP');

	intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>();
		const method = request.method;
		const url = request.url;
		const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
		const userAgent = request.headers['user-agent'] || '';
		const now = Date.now();

		return next.handle().pipe(
			tap({
				next: (): void => {
					const response = context
						.switchToHttp()
						.getResponse<Response>();
					const statusCode = response.statusCode;
					const delay = Date.now() - now;

					this.logger.log(
						`${method} ${url} ${statusCode} - ${userAgent} ${ip} +${delay}ms`,
					);
				},
				error: (error: Error): void => {
					const delay = Date.now() - now;
					const status =
						error instanceof HttpException
							? error.getStatus()
							: 500;

					if (status >= 500) {
						this.logger.error(
							`${method} ${url} ${status} - ${userAgent} ${ip} +${delay}ms`,
							error.stack,
						);
					}
				},
			}),
		);
	}
}
