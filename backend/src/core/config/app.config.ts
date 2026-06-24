import { registerAs } from '@nestjs/config';

export interface AppConfig {
	nodeEnv: 'development' | 'production' | 'test';
	port: number;
	frontendUrl: string;
	cookieSecret: string;
}

export default registerAs('app', (): AppConfig => {
	const nodeEnv = (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development';
	return {
		nodeEnv,
		port: Number(process.env.PORT) || 3000,
		frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
		cookieSecret: process.env.COOKIE_SECRET || 'default_cookie_secret',
	};
});