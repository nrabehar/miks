import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'refresh_token',
  refreshCookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
}));
