import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { authKeys } from "#/features/auth/queries"
import type { User } from "#/features/auth/schema"

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ context: { queryClient }, location }) => {
		const user = queryClient.getQueryData<User | null>(authKeys.me())

		if (!user) {
			throw redirect({
				to: "/auth/login",
				search: { redirect: location.href },
			})
		}

		return { user }
	},
	component: Outlet,
})
