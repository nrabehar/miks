import { ConfigService } from '$lib/config/config.service';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const DEVICE_ID_HEADER = 'x-device-id';

export interface RequestWithDeviceId extends Request {
	deviceId: string;
}

/**
 * Resolves the client's device ID (AC-13): a header for a direct API call
 * (the future mobile app), or a cookie for the web app (needed because the
 * OAuth callback is a full browser redirect, where the web app cannot
 * attach a custom header). Runs as middleware, ahead of the Passport
 * guards, so it also fires on /auth/google and /auth/facebook before they
 * redirect to the provider (those handlers' bodies never run).
 *
 * The cookie is set by the server, httpOnly, only when the request arrives
 * without one; it is never generated or written by client side JavaScript.
 */
@Injectable()
export class DeviceIdMiddleware implements NestMiddleware {
	constructor(private readonly config: ConfigService) {}

	use(req: Request, res: Response, next: NextFunction): void {
		const cookieName = this.config.auth.deviceIdCookieName;
		const headerValue = req.headers[DEVICE_ID_HEADER];
		const fromHeader = Array.isArray(headerValue)
			? headerValue[0]
			: headerValue;
		const fromCookie = (
			req.cookies as Record<string, string> | undefined
		)?.[cookieName];

		let deviceId = fromHeader ?? fromCookie;

		if (!deviceId) {
			deviceId = randomUUID();
			res.cookie(cookieName, deviceId, {
				httpOnly: true,
				secure: this.config.auth.cookieSecure,
				domain: this.config.auth.cookieDomain,
				sameSite: 'lax',
				maxAge:
					this.config.auth.deviceIdCookieMaxAgeDays *
					24 *
					60 *
					60 *
					1000,
			});
		}

		(req as RequestWithDeviceId).deviceId = deviceId;
		next();
	}
}
