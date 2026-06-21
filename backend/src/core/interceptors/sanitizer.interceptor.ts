import { sanitizeObject } from '#/core/utils';
import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class SanitizerInterceptor implements NestInterceptor {
	private readonly fieldsToSanitize = [
		'content',
		'message',
		'text',
		'bio',
		'name',
		'description',
		'title',
		'comment',
	];

	intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>();

		if (request.body && typeof request.body === 'object') {
			const body = request.body as Record<string, unknown>;
			request.body = sanitizeObject(body, this.fieldsToSanitize);
		}

		return next.handle();
	}
}
