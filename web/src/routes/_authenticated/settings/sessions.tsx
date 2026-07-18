import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog"
import { Skeleton } from "#/components/ui/skeleton"
import { useRevokeSession, useSessions } from "#/features/auth/hooks"
import type { Session } from "#/features/auth/schema"

export const Route = createFileRoute("/_authenticated/settings/sessions")({
	component: SessionsPage,
})

function SessionsPage() {
	const { t } = useTranslation()
	const { data: sessions, isPending } = useSessions()

	return (
		<div className="mx-auto max-w-3xl px-6 py-10">
			<Card>
				<CardHeader>
					<CardTitle>{t("auth.sessions.title")}</CardTitle>
					<CardDescription>{t("auth.sessions.subtitle")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					{isPending && (
						<>
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</>
					)}

					{!isPending && sessions?.length === 0 && (
						<p className="text-muted-foreground text-sm">
							{t("auth.sessions.empty")}
						</p>
					)}

					{sessions?.map((session) => (
						<SessionRow key={session.id} session={session} />
					))}
				</CardContent>
			</Card>
		</div>
	)
}

function SessionRow({ session }: { session: Session }) {
	const { t } = useTranslation()
	const revoke = useRevokeSession()

	return (
		<div className="border-border flex items-center justify-between gap-4 rounded-lg border p-4">
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">
						{session.userAgent ?? t("auth.sessions.unknownDevice")}
					</span>
					{session.current && (
						<Badge variant="secondary">{t("auth.sessions.current")}</Badge>
					)}
				</div>
				<span className="text-muted-foreground text-xs">
					{session.ip ?? t("auth.sessions.unknownIp")} ·{" "}
					{new Date(session.createdAt).toLocaleString()}
				</span>
			</div>

			{!session.current && (
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="outline" size="sm" disabled={revoke.isPending}>
							{t("auth.sessions.revoke")}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{t("auth.sessions.revokeConfirmTitle")}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{t("auth.sessions.revokeConfirmDescription")}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t("auth.sessions.cancel")}</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => revoke.mutate(session.id)}
							>
								{t("auth.sessions.revoke")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	)
}
