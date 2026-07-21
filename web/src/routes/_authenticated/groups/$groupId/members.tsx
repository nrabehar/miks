import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import { useMe } from "#/features/auth/hooks"
import { MemberRow } from "#/features/groups/components/member-row"
import { findMockGroup, findMockMembers } from "#/features/groups/mock-data"

export const Route = createFileRoute("/_authenticated/groups/$groupId/members")({
	component: MembersPage,
})

function MembersPage() {
	const { t } = useTranslation()
	const { groupId } = Route.useParams()
	const group = findMockGroup(groupId)
	const members = findMockMembers(groupId)
	const { data: me } = useMe()

	const isClosed = group?.status === "CLOSED"
	const activeCount = members.filter((member) => member.status === "ACTIVE").length
	// Mirrors RemovalVotesService.proposeRemoval's floor: a removal vote needs
	// at least 2 other active members besides the target, and its minQuorum a
	// bare majority of them (api/src/modules/groups/removal-votes.service.ts).
	const othersCount = activeCount - 1
	const canPropose = othersCount >= 2
	const minQuorum = Math.floor(othersCount / 2) + 1
	const myMemberId = members.find((member) => member.userId === me?.id)?.id

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("groups.members.title")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{members.length === 0 && (
					<p className="text-muted-foreground text-sm">{t("groups.members.empty")}</p>
				)}

				{members.map((member) => (
					<MemberRow
						key={member.id}
						groupId={groupId}
						member={member}
						isClosed={isClosed}
						myMemberId={myMemberId}
						canPropose={canPropose}
						minQuorum={minQuorum}
					/>
				))}
			</CardContent>
		</Card>
	)
}
