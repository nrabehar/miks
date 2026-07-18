import { useState } from "react"
import { useTranslation } from "react-i18next"
import { X } from "lucide-react"
import { Alert, AlertDescription } from "#/components/ui/alert"
import { Button } from "#/components/ui/button"
import { useMe } from "#/features/auth/hooks"

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

	if (!user || user.emailVerified || dismissed) return null

	function handleDismiss() {
		sessionStorage.setItem(DISMISSED_KEY, "1")
		setDismissed(true)
	}

	return (
		<Alert className="rounded-none border-x-0 border-t-0">
			<AlertDescription className="flex items-center justify-between gap-4">
				<span>{t("auth.verifyBanner.message")}</span>
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
