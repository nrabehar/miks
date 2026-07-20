import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { isAxiosError } from "axios"
import { useQuery } from "@tanstack/react-query"
import { MiksLogo } from "#/components/brand/logo"
import { Button } from "#/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "#/components/ui/card"
import { Skeleton } from "#/components/ui/skeleton"
import { useMe } from "#/features/auth/hooks"
import { useAcceptInvite } from "#/features/groups/hooks"
import { fetchInvitePreview } from "#/features/groups/api"

export const Route = createFileRoute("/invites/$token")({
	component: InviteLandingPage,
})

type AcceptError = "invalid" | "mismatch" | "generic"

function InviteLandingPage() {
	const { t } = useTranslation()
	const { token } = Route.useParams()
	const navigate = useNavigate()
	const { data: user, isPending: userPending } = useMe()
	const acceptInvite = useAcceptInvite()
	const [acceptError, setAcceptError] = useState<AcceptError | null>(null)
	const attempted = useRef(false)

	const preview = useQuery({
		queryKey: ["invites", "preview", token],
		queryFn: () => fetchInvitePreview(token),
		retry: false,
	})

	const redirectTarget = `/invites/${token}`

	useEffect(() => {
		if (userPending || !user || attempted.current) {
			return
		}

		attempted.current = true

		acceptInvite
			.mutateAsync(token)
			.then((member) => {
				void navigate({ to: "/groups/$groupId", params: { groupId: member.groupId } })
			})
			.catch((error: unknown) => {
				const status = isAxiosError(error) ? error.response?.status : undefined
				setAcceptError(status === 403 ? "mismatch" : status === 409 ? "invalid" : "generic")
			})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userPending, user, token])

	if (userPending || (user && !acceptError)) {
		return (
			<div className="flex min-h-svh items-center justify-center p-6">
				<Skeleton className="h-40 w-full max-w-md" />
			</div>
		)
	}

	if (acceptError) {
		return (
			<InviteShell>
				<CardTitle>{t("groups.invite.errorTitle")}</CardTitle>
				<CardDescription>
					{acceptError === "mismatch"
						? t("groups.invite.emailMismatch")
						: t("groups.invite.noLongerValid")}
				</CardDescription>
				<Button asChild className="mt-4">
					<Link to="/">{t("groups.invite.backToDashboard")}</Link>
				</Button>
			</InviteShell>
		)
	}

	if (preview.isPending) {
		return (
			<div className="flex min-h-svh items-center justify-center p-6">
				<Skeleton className="h-40 w-full max-w-md" />
			</div>
		)
	}

	if (preview.isError) {
		return (
			<InviteShell>
				<CardTitle>{t("groups.invite.errorTitle")}</CardTitle>
				<CardDescription>{t("groups.invite.noLongerValid")}</CardDescription>
			</InviteShell>
		)
	}

	return (
		<InviteShell>
			<CardTitle>{t("groups.invite.previewTitle", { groupName: preview.data.groupName })}</CardTitle>
			<CardDescription>
				{t("groups.invite.previewSubtitle", { inviter: preview.data.invitedBy })}
			</CardDescription>
			<div className="mt-6 flex flex-col gap-3">
				<Button asChild>
					<Link to="/auth/login" search={{ redirect: redirectTarget }}>
						{t("groups.invite.login")}
					</Link>
				</Button>
				<Button asChild variant="outline">
					<Link to="/auth/register" search={{ redirect: redirectTarget }}>
						{t("groups.invite.register")}
					</Link>
				</Button>
			</div>
		</InviteShell>
	)
}

function InviteShell({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
			<div className="flex items-center gap-2">
				<MiksLogo className="h-8 w-8" />
				<span className="text-lg font-semibold">Miks</span>
			</div>
			<Card className="w-full max-w-md">
				<CardHeader>{children}</CardHeader>
			</Card>
		</div>
	)
}
