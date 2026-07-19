import { env } from "#/lib/config/env"
import * as Sentry from "@sentry/react"

// Points at a self hosted Rustrak instance (Sentry SDK compatible), not
// Sentry's own paid service (spec 0001-frontend-architecture). No DSN in
// this environment (e.g. local dev) → skip rather than fail loudly, since
// crash reporting is not required to run the app locally.
export function initErrorReporting() {
	if (!env.VITE_SENTRY_DSN) return

	Sentry.init({
		dsn: env.VITE_SENTRY_DSN,
		environment: env.VITE_APP_ENV,
		// enableInp: false — our self hosted Rustrak ingest instance rejects
		// the standalone span envelopes the SDK sends for INP (Interaction
		// to Next Paint) web vitals, 400 "Missing event_id in envelope
		// headers"; it doesn't support that envelope shape. This only
		// silences that one non-user-facing telemetry type; error reporting
		// and normal transaction tracing are unaffected.
		integrations: [Sentry.browserTracingIntegration({ enableInp: false })],
		tracesSampleRate: env.VITE_APP_ENV === "production" ? 0.1 : 1,
		sendClientReports: false,
	})
}
