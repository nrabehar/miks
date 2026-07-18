import { z } from "zod"

const envSchema = z.object({
	VITE_API_URL: z.url(),
	VITE_API_PATH: z.string().default("/api"),
	VITE_SENTRY_DSN: z.string().optional(),
	VITE_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
})

function loadEnv() {
	const parsed = envSchema.safeParse(import.meta.env)

	if (!parsed.success) {
		throw new Error(
			`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`,
		)
	}

	return parsed.data
}

export const env = loadEnv()
