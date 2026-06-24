import { registerAs } from '@nestjs/config';

export interface AppConfig {
	nodeEnv: 'development' | 'production' | 'test';
	port: number;
	host: string;
	frontendUrl: string;
}

export default registerAs('app', (): AppConfig => {
	const nodeEnv = (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development';
	return {
		nodeEnv,
		port: Number(process.env.PORT) || 3000,
		host: process.env.HOST || '0.0.0.0',
		frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
	};
});