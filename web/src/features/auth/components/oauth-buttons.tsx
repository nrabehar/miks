import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { apiClient } from "#/lib/api/client"
import { Button } from "#/components/ui/button"
import { authKeys } from "#/features/auth/queries"
import {
	OAUTH_CHANNEL_NAME,
	OAUTH_POPUP_WINDOW_NAME,
	OAUTH_SUCCESS_MESSAGE,
} from "#/features/auth/oauth-callback-message"

interface OAuthButtonProps {
	provider: "google" | "facebook"
}

function providerUrl(provider: OAuthButtonProps["provider"]): string {
	const base = apiClient.defaults.baseURL ?? ""
	return `${base}/auth/${provider}`
}

// Login and register both offer these buttons (spec 0002-auth-flows AC-8,
// AC-9). The popup broadcasts completion on a BroadcastChannel and closes
// itself on success (not window.opener.postMessage: the OAuth provider's own
// page sets a restrictive Cross-Origin-Opener-Policy header that permanently
// severs window.opener once the popup navigates there, even after it
// navigates back to our origin); if the browser blocks the popup, this falls
// back to a full page redirect to the same OAuth URL instead of failing
// silently.
//
// There is deliberately no "is the popup still open" poll here. Reading
// `.closed` on a COOP-severed popup doesn't just throw a catchable error, it
// makes Chrome print its own "Cross-Origin-Opener-Policy policy would block
// the window.closed call" line straight to the console, a browser level
// report, not a JS exception, so no try/catch on our side can silence it.
// The BroadcastChannel above is COOP proof and already covers completion;
// the timeout below covers the user abandoning the popup instead.
//
// The channel is listened to exactly once, in OAuthButtons below, not one
// subscription per button: Google and Facebook are both mounted at the same
// time on this page, so if each OAuthButton opened its own listener, a
// single success broadcast (from whichever provider was actually used) fired
// in EVERY mounted listener at once, each independently calling navigate(),
// which raced against the auth guard's own redirect and bounced the user
// back to /auth/login instead of landing them on "/" (confirmed via Sentry's
// breadcrumbs: four alternating /auth/login <-> / navigations in the same
// 38ms window right after a successful OAuth popup closed).
function OAuthButton({
	provider,
	pending,
	timedOut,
	onClick,
	onManualContinue,
}: OAuthButtonProps & {
	pending: boolean
	timedOut: boolean
	onClick: () => void
	onManualContinue: () => void
}) {
	const { t } = useTranslation()

	return (
		<div className="flex flex-col gap-1">
			<Button
				type="button"
				variant="outline"
				className="w-full"
				disabled={pending}
				onClick={onClick}
			>
				<ProviderIcon provider={provider} />
				{pending
					? t(`auth.oauth.${provider}Pending`)
					: t(`auth.oauth.${provider}`)}
			</Button>
			{timedOut && (
				<button
					type="button"
					onClick={onManualContinue}
					className="text-muted-foreground text-xs underline underline-offset-2"
				>
					{t("auth.oauth.manualContinue")}
				</button>
			)}
		</div>
	)
}

function useOAuthPopup(provider: OAuthButtonProps["provider"]) {
	const [pending, setPending] = useState(false)
	const [timedOut, setTimedOut] = useState(false)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		return () => cleanup()
	}, [])

	function cleanup() {
		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		setPending(false)
	}

	function handleClick() {
		const url = providerUrl(provider)
		const popup = window.open(
			url,
			OAUTH_POPUP_WINDOW_NAME,
			"width=520,height=640,menubar=no,toolbar=no",
		)

		if (!popup) {
			// Popup blocked: fall back to a full page redirect (AC-9).
			window.location.href = url
			return
		}

		setPending(true)
		setTimedOut(false)

		timeoutRef.current = setTimeout(() => {
			setTimedOut(true)
		}, 90_000)
	}

	function handleManualContinue() {
		cleanup()
		window.location.href = providerUrl(provider)
	}

	return { pending, timedOut, handleClick, handleManualContinue, cleanup }
}

function ProviderIcon({ provider }: OAuthButtonProps) {
	if (provider === "google") {
		return (
			<svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
				<path
					fill="#4285F4"
					d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
				/>
				<path
					fill="#34A853"
					d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
				/>
				<path
					fill="#FBBC05"
					d="M5.27 14.28c-.25-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.63H1.29A11.96 11.96 0 000 12c0 1.94.46 3.77 1.29 5.37z"
				/>
				<path
					fill="#EA4335"
					d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
				/>
			</svg>
		)
	}

	return (
		<svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
			<path
				fill="#1877F2"
				d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"
			/>
		</svg>
	)
}

export function OAuthButtons() {
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const google = useOAuthPopup("google")
	const facebook = useOAuthPopup("facebook")

	// The one and only listener for the popup's success broadcast (see the
	// note on OAuthButton above for why this must not be duplicated per
	// button).
	useEffect(() => {
		const channel = new BroadcastChannel(OAUTH_CHANNEL_NAME)

		channel.onmessage = (event: MessageEvent) => {
			if (event.data !== OAUTH_SUCCESS_MESSAGE) return

			google.cleanup()
			facebook.cleanup()
			void queryClient.invalidateQueries({ queryKey: authKeys.me() })
			void navigate({ to: "/" })
		}

		return () => channel.close()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<div className="flex flex-col gap-2">
			<OAuthButton
				provider="google"
				pending={google.pending}
				timedOut={google.timedOut}
				onClick={google.handleClick}
				onManualContinue={google.handleManualContinue}
			/>
			<OAuthButton
				provider="facebook"
				pending={facebook.pending}
				timedOut={facebook.timedOut}
				onClick={facebook.handleClick}
				onManualContinue={facebook.handleManualContinue}
			/>
		</div>
	)
}
