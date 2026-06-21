/**
 * No-body DTO — refresh endpoint reads the refresh token from the
 * `refreshToken` httpOnly cookie. Defined so NestJS has something to bind
 * against for future fields (e.g. CSRF token).
 */
export class RefreshDto {}