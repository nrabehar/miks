import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { MiksLogo } from "#/components/brand/logo"
import { Avatar, AvatarFallback } from "#/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import { Skeleton } from "#/components/ui/skeleton"
import { useLogout, useMe } from "#/features/auth/hooks"

export const Route = createFileRoute("/_authenticated/")({
	component: DashboardPage,
})

function DashboardPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { data: user, isPending } = useMe()
	const logout = useLogout()

	async function handleLogout() {
		await logout.mutateAsync()
		await navigate({ to: "/auth/login" })
	}

	const initials = user?.displayName
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase()

	return (
		<div className="bg-background min-h-svh">
			<header className="border-border flex items-center justify-between border-b px-6 py-4">
				<div className="flex items-center gap-2">
					<MiksLogo className="h-7 w-7" />
					<span className="font-semibold">Miks</span>
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2"
						>
							<Avatar>
								<AvatarFallback>{initials ?? "--"}</AvatarFallback>
							</Avatar>
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onSelect={() => void handleLogout()}
							disabled={logout.isPending}
						>
							{t("dashboard.logout")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</header>

			<main className="mx-auto max-w-3xl px-6 py-10">
				<Card>
					<CardHeader>
						<CardTitle>
							{isPending ? (
								<Skeleton className="h-7 w-64" />
							) : (
								t("dashboard.welcome", { name: user?.displayName })
							)}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<p className="text-muted-foreground text-sm">
							{t("dashboard.subtitle")}
						</p>
						<div className="flex items-center gap-2 pt-2 text-sm">
							<span className="text-muted-foreground">
								{t("dashboard.role")}:
							</span>
							{isPending ? (
								<Skeleton className="h-5 w-20" />
							) : (
								<span className="font-medium">{user?.role}</span>
							)}
						</div>
					</CardContent>
				</Card>
			</main>
		</div>
	)
}
