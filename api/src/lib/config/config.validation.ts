const REQUIRED_ENV_VARS = [
	'DATABASE_URL',
	'JWT_ACCESS_SECRET',
	'JWT_REFRESH_SECRET',
] as const;

export function validate(env: Record<string, unknown>) {
	const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]);

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}`,
		);
	}

	return env;
}
