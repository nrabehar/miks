import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const { method, originalUrl } = request;
    const start = performance.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(method, originalUrl, response.statusCode, start),
        error: (error) =>
          this.log(method, originalUrl, error?.status ?? 500, start),
      }),
    );
  }

  private log(method: string, url: string, statusCode: number, start: number) {
    const duration = Math.round(performance.now() - start);
    this.logger.log(`${method} ${url} ${statusCode} - ${duration}ms`);
  }
}
