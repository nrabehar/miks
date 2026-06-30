import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const SENSITIVE = new Set(['passwordHash', 'salt', 'twoFaSecret', 'pinHash', 'accessToken', 'refreshToken']);

function strip(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(strip);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([k]) => !SENSITIVE.has(k))
        .map(([k, v]) => [k, strip(v)]),
    );
  }
  return obj;
}

@Injectable()
export class SanitizerInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(strip));
  }
}
