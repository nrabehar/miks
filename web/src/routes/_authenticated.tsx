import { VerifyBanner } from "#/features/auth/components/verify-banner"
import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated")({
	// beforeLoad: ({ context: { queryClient }, location }) => {
	// 	const user = queryClient.getQueryData<User | null>(authKeys.me())

	// 	if (!user) {
	// 		throw redirect({
	// 			to: "/auth/login",
	// 			search: { redirect: location.href },
	// 		})
	// 	}

	// 	return { user }
	// },
	component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
	return (
		<>
			<VerifyBanner />
			<Outlet />
		</>
	)
}
