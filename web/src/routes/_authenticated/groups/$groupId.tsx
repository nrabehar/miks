import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { isAxiosError } from "axios"
import { groupQueryOptions } from "#/features/groups/queries"

// The single place group membership is checked before any group content
// renders (spec 0003-group-membership-ui's Security model): every nested
// group route relies on this beforeLoad, mirroring the _authenticated.tsx
// guard pattern rather than re-checking membership itself.
export const Route = createFileRoute("/_authenticated/groups/$groupId")({
	beforeLoad: async ({ context: { queryClient }, params }) => {
		try {
			await queryClient.ensureQueryData(groupQueryOptions(params.groupId))
		} catch (error) {
			if (isAxiosError(error) && error.response?.status === 403) {
				throw redirect({
					to: "/",
					search: { groupError: "not-a-member" },
				})
			}

			throw error
		}
	},
	component: () => <Outlet />,
})
