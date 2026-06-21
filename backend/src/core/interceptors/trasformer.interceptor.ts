import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
	data: T;
	timestamp: string;
	statusCode: number;
}

@Injectable()
export class TransformerInterceptor<T> implements NestInterceptor<
	T,
	ApiResponse<T>
> {
	intercept(
		context: ExecutionContext,
		next: CallHandler,
	): Observable<ApiResponse<T>> {
		const response = context.switchToHttp().getResponse<Response>();
		const statusCode = response.statusCode;
		return next.handle().pipe(
			map((data: T) => ({
				data,
				timestamp: new Date().toISOString(),
				statusCode,
			})),
		);
	}
}
