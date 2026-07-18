import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { MiksLogo } from "#/components/brand/logo"
import { authKeys } from "#/features/auth/queries"
import {
	OAUTH_CHANNEL_NAME,
	OAUTH_POPUP_WINDOW_NAME,
	OAUTH_SUCCESS_MESSAGE,
} from "#/features/auth/oauth-callback-message"

const searchSchema = z.object({
	// The router's default search parser JSON-parses each raw value, so the
	// `?requiresDeviceConfirmation=true` query string arrives here as the
	// boolean `true`, not the string `"true"` — not a string enum.
	requiresDeviceConfirmation: z.boolean().optional(),
	confirmationId: z.string().optional(),
})

export const Route = createFileRoute("/auth/oauth-callback")({
	validateSearch: searchSchema,
	component: OAuthCallbackPage,
})

// The backend's OAuth callback (google/facebook) already set the session
// cookies before redirecting here (spec 0002-auth-flows), unless the device
// wasn't recognized yet: then it redirects here with
// requiresDeviceConfirmation/confirmationId instead (spec 0001-authentication's
// 2026-07-18 addendum, AC-15), and /auth/login's confirmation step (which
// already knows how to finish a popup vs. a full page flow) takes over. In a
// popup on the success path, this route's only job is to broadcast success
// and close itself. Detected via window.name (set by oauth-buttons.tsx's
// window.open call), not window.opener: the OAuth provider's own page sets a
// restrictive Cross-Origin-Opener-Policy header that permanently severs
// window.opener once the popup navigates there, even after it navigates back
// to our origin, so window.opener is unreliable by the time we land here. If
// the popup was blocked and this landed as a normal full page navigation
// instead, just go to the app.
function OAuthCallbackPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const { requiresDeviceConfirmation, confirmationId } = Route.useSearch()

	useEffect(() => {
		if (requiresDeviceConfirmation && confirmationId) {
			void navigate({
				to: "/auth/login",
				search: { confirmationId },
				replace: true,
			})
			return
		}

		if (window.name === OAUTH_POPUP_WINDOW_NAME) {
			const channel = new BroadcastChannel(OAUTH_CHANNEL_NAME)
			channel.postMessage(OAUTH_SUCCESS_MESSAGE)
			channel.close()
			window.close()
			return
		}

		void queryClient.invalidateQueries({ queryKey: authKeys.me() }).then(() => {
			void navigate({ to: "/" })
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-4">
			<MiksLogo className="h-9 w-9 animate-pulse" />
			<p className="text-muted-foreground text-sm">
				{t("auth.oauth.completing")}
			</p>
		</div>
	)
}
