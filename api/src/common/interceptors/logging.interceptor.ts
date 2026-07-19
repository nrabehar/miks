import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger = new Logger('HTTP');

	intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Observable<unknown> {
		const ctx = context.switchToHttp();
		const request = ctx.getRequest<Request>();
		const response = ctx.getResponse<Response>();
		const { method, originalUrl } = request;
		const start = performance.now();

		return next.handle().pipe(
			tap({
				next: () =>
					this.log(method, originalUrl, response.statusCode, start),
				error: (error: unknown) =>
					this.log(method, originalUrl, this.statusOf(error), start),
			}),
		);
	}

	private statusOf(error: unknown): number {
		if (
			typeof error === 'object' &&
			error !== null &&
			'status' in error &&
			typeof error.status === 'number'
		) {
			return error.status;
		}

		return 500;
	}

	private log(
		method: string,
		url: string,
		statusCode: number,
		start: number,
	) {
		const duration = Math.round(performance.now() - start);
		this.logger.log(`${method} ${url} ${statusCode} - ${duration}ms`);
	}
}
