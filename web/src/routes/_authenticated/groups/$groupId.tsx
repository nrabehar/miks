import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { AuthenticatedHeader } from "#/components/layout/AuthenticatedHeader"
import { GroupBreadcrumbs } from "#/features/groups/components/dashboard/group-breadcrumbs"
import { GroupSidebar } from "#/features/groups/components/dashboard/group-sidebar"
import { findMockGroup } from "#/features/groups/mock-data"

// No backend to check real membership against yet: this looks the group up
// in the mock dataset (features/groups/mock-data.ts) instead of calling the
// real groups API, but keeps the same redirect-on-missing-group contract so
// swapping back to `queryClient.ensureQueryData(groupQueryOptions(...))` +
// a 403 check is a one-line change once the backend is wired in.
export const Route = createFileRoute("/_authenticated/groups/$groupId")({
	beforeLoad: ({ params }) => {
		if (!findMockGroup(params.groupId)) {
			throw redirect({
				to: "/",
				search: { groupError: "not-a-member" },
			})
		}
	},
	component: GroupLayout,
})

function GroupLayout() {
	const { t } = useTranslation()
	const { groupId } = Route.useParams()
	const group = findMockGroup(groupId)
	const pathname = useRouterState({ select: (state) => state.location.pathname })

	const section = pathname.endsWith("/members")
		? t("groups.detail.membersTab")
		: pathname.endsWith("/invites")
			? t("groups.detail.invitesTab")
			: pathname.endsWith("/settings")
				? t("groups.detail.settingsTab")
				: t("groups.detail.dashboardTab")

	if (!group) {
		return null
	}

	return (
		<div className="min-h-screen">
			<AuthenticatedHeader />

			<div className="flex w-full flex-col lg:flex-row">
				<GroupSidebar groupId={groupId} group={group} />
				<main className="min-w-0 flex-1 space-y-6 px-4 py-6 duration-300 animate-in fade-in sm:px-6 lg:px-8">
					<GroupBreadcrumbs groupId={groupId} groupName={group.name} section={section} />
					<Outlet />
				</main>
			</div>
		</div>
	)
}
