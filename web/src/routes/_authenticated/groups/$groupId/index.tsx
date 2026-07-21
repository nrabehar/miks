import { createFileRoute } from "@tanstack/react-router"

import { GroupOverviewDashboard } from "#/features/groups/components/dashboard/group-overview-dashboard"
import { findMockGroup } from "#/features/groups/mock-data"

export const Route = createFileRoute("/_authenticated/groups/$groupId/")({
	component: GroupIndexPage,
})

function GroupIndexPage() {
	const { groupId } = Route.useParams()
	const group = findMockGroup(groupId)

	if (!group) {
		return null
	}

	return <GroupOverviewDashboard group={group} />
}
