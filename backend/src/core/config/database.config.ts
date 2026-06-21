import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
	postgresUrl: string;
	redisUrl: string;
}

export default registerAs<DatabaseConfig>(
	'database',
	(): DatabaseConfig => ({
		postgresUrl: process.env.DATABASE_URL!,
		redisUrl: process.env.REDIS_URL!,
	}),
);
