import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
	success: true;
	statusCode: number;
	data: T;
	path: string;
	timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
	T,
	Response<T>
> {
	intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Observable<Response<T>> {
		const ctx = context.switchToHttp();
		const request = ctx.getRequest();
		const response = ctx.getResponse();

		return next.handle().pipe(
			map((data) => ({
				success: true,
				statusCode: response.statusCode,
				data,
				path: request.url,
				timestamp: new Date().toISOString(),
			})),
		);
	}
}
