import { useTranslation } from "react-i18next"
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
import { Button } from "#/components/ui/button"
import { useRevokeInvite } from "#/features/groups/hooks"
import type { GroupInvite } from "#/features/groups/schema"

export function InviteRow({
	groupId,
	invite,
}: {
	groupId: string
	invite: GroupInvite
}) {
	const { t } = useTranslation()
	const revoke = useRevokeInvite(groupId)

	return (
		<div className="border-border flex items-center justify-between gap-4 rounded-lg border p-4">
			<div className="flex flex-col gap-1">
				<span className="text-sm font-medium">{invite.email}</span>
				<span className="text-muted-foreground text-xs">
					{t("groups.invites.expiresAt", {
						date: new Date(invite.expiresAt).toLocaleDateString(),
					})}
				</span>
			</div>

			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button variant="outline" size="sm" disabled={revoke.isPending}>
						{t("groups.invites.revoke")}
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("groups.invites.revokeConfirmTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("groups.invites.revokeConfirmDescription", { email: invite.email })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("groups.invites.cancel")}</AlertDialogCancel>
						<AlertDialogAction onClick={() => revoke.mutate(invite.id)}>
							{t("groups.invites.revoke")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
