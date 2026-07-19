import { useState } from "react"
import { useTranslation } from "react-i18next"
import { isAxiosError } from "axios"
import { X } from "lucide-react"
import { Alert, AlertDescription } from "#/components/ui/alert"
import { Button } from "#/components/ui/button"
import { useMe, useResendVerification } from "#/features/auth/hooks"
import { useCooldown } from "#/features/auth/use-cooldown"

const DISMISSED_KEY = "miks:verify-banner-dismissed"

// Shown on every authenticated page while the account's local (password)
// identity is unverified, dismissible only for the current session
// (sessionStorage, not persisted account side): it reappears next visit
// until emailVerified actually becomes true (spec 0002-auth-flows AC-2).
export function VerifyBanner() {
	const { t } = useTranslation()
	const { data: user } = useMe()
	const [dismissed, setDismissed] = useState(
		() => sessionStorage.getItem(DISMISSED_KEY) === "1",
	)
	const resend = useResendVerification()
	const cooldown = useCooldown()
	const [sent, setSent] = useState(false)
	const [error, setError] = useState(false)

	if (!user || user.emailVerified || dismissed) return null

	function handleDismiss() {
		sessionStorage.setItem(DISMISSED_KEY, "1")
		setDismissed(true)
	}

	async function handleResend() {
		if (!user?.email) return

		setError(false)

		try {
			await resend.mutateAsync(user.email)
			setSent(true)
		} catch (thrown) {
			if (isAxiosError(thrown) && thrown.response?.status === 429) {
				cooldown.start(60)
				return
			}

			setError(true)
		}
	}

	return (
		<Alert className="rounded-none border-x-0 border-t-0">
			<AlertDescription className="flex items-center justify-between gap-4">
				<span>
					{t("auth.verifyBanner.message")}{" "}
					{sent ? (
						t("auth.verifyBanner.resendSent")
					) : (
						<Button
							type="button"
							variant="link"
							className="h-auto p-0"
							disabled={resend.isPending || cooldown.active}
							onClick={handleResend}
						>
							{cooldown.active
								? t("auth.verifyEmail.cooldown", {
										seconds: cooldown.remaining,
									})
								: t("auth.verifyBanner.resend")}
						</Button>
					)}
					{error && (
						<span className="text-destructive block">
							{t("auth.verifyBanner.resendError")}
						</span>
					)}
				</span>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-6 w-6 shrink-0"
					onClick={handleDismiss}
					aria-label={t("auth.verifyBanner.dismiss")}
				>
					<X className="h-4 w-4" />
				</Button>
			</AlertDescription>
		</Alert>
	)
}
