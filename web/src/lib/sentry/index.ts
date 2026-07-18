import * as Sentry from "@sentry/react"
import { env } from "#/lib/config/env"

// Points at a self hosted Rustrak instance (Sentry SDK compatible), not
// Sentry's own paid service (spec 0001-frontend-architecture). No DSN in
// this environment (e.g. local dev) → skip rather than fail loudly, since
// crash reporting is not required to run the app locally.
export function initErrorReporting() {
	if (!env.VITE_SENTRY_DSN) return

	Sentry.init({
		dsn: env.VITE_SENTRY_DSN,
		environment: env.VITE_APP_ENV,
		integrations: [Sentry.browserTracingIntegration()],
		tracesSampleRate: env.VITE_APP_ENV === "production" ? 0.1 : 1,
	})
}
