import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { MiksLogo } from "#/components/brand/logo"
import { authKeys } from "#/features/auth/queries"
import { OAUTH_SUCCESS_MESSAGE } from "#/features/auth/oauth-callback-message"

export const Route = createFileRoute("/auth/oauth-callback")({
	component: OAuthCallbackPage,
})

// The backend's OAuth callback (google/facebook) already set the session
// cookies before redirecting here (spec 0002-auth-flows). In a popup, this
// route's only job is to tell the opener and close itself. If the popup was
// blocked and this landed as a normal full page navigation instead (no
// opener), just go to the app.
function OAuthCallbackPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const queryClient = useQueryClient()

	useEffect(() => {
		const isPopup = window.opener && window.opener !== window

		if (isPopup) {
			window.opener.postMessage(OAUTH_SUCCESS_MESSAGE, window.location.origin)
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
