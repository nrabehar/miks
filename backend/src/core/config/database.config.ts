import { registerAs } from "@nestjs/config";

export interface DatabaseConfig {
	url: string;
}


export default registerAs<DatabaseConfig>(
	'database',
	(): DatabaseConfig => ({
		url: process.env.DATABASE_URL!,
	})
)