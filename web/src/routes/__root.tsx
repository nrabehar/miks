import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import type { QueryClient } from "@tanstack/react-query"
import { Toaster } from "#/components/ui/sonner"
import { authKeys, meQueryOptions } from "#/features/auth/queries"

interface RouterContext {
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
	// Confirms who is logged in exactly once per app load; every protected
	// route's beforeLoad then reuses this cached answer instead of calling
	// /auth/me again on every navigation (spec 0001-frontend-architecture).
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(meQueryOptions).catch(() => {
			queryClient.setQueryData(authKeys.me(), null)
		})
	},
	component: RootComponent,
})

function RootComponent() {
	return (
		<>
			<Outlet />
			<Toaster />
			{import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
		</>
	)
}
