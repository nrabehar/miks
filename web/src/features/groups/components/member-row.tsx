import { useTranslation } from "react-i18next"
import { Badge } from "#/components/ui/badge"
import { useMe } from "#/features/auth/hooks"
import type { GroupMember } from "#/features/groups/schema"

export function MemberRow({ member }: { member: GroupMember }) {
	const { t } = useTranslation()
	const { data: me } = useMe()
	const isMe = member.userId === me?.id

	return (
		<div className="border-border flex items-center justify-between gap-4 rounded-lg border p-4">
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">
						{isMe ? me.displayName : t("groups.members.unknownMember", { id: member.userId.slice(0, 8) })}
					</span>
					{isMe && <Badge variant="secondary">{t("groups.members.you")}</Badge>}
					{member.status === "LEFT" && (
						<Badge variant="outline">{t("groups.members.left")}</Badge>
					)}
				</div>
				<span className="text-muted-foreground text-xs">
					{member.status === "ACTIVE"
						? t("groups.members.joinedAt", {
								date: new Date(member.joinedAt).toLocaleDateString(),
							})
						: t("groups.members.leftAt", {
								date: member.leftAt
									? new Date(member.leftAt).toLocaleDateString()
									: "",
							})}
				</span>
			</div>
		</div>
	)
}
