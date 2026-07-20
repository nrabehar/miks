import {
	createFileRoute,
	isRedirect,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { MiksLogo } from "#/components/brand/logo"
import { Avatar, AvatarFallback } from "#/components/ui/avatar"
import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import { Skeleton } from "#/components/ui/skeleton"
import { useLogout, useMe } from "#/features/auth/hooks"
import { useGroups } from "#/features/groups/hooks"
import { groupsListQueryOptions } from "#/features/groups/queries"
import type { Group } from "#/features/groups/schema"
import { toast } from "sonner"

const PAGE_SIZE = 20

const searchSchema = z.object({
	page: z.number().int().min(1).optional(),
	groupError: z.enum(["not-a-member"]).optional(),
})

export const Route = createFileRoute("/_authenticated/")({
	validateSearch: searchSchema,
	// A user with zero groups lands directly in the create group form
	// instead of an empty dashboard (spec 0003-group-membership-ui AC-1).
	// A fetch failure here (offline, transient error) is not a reason to
	// block the whole route: fall through to the dashboard, whose own
	// useGroups query renders the usual loading/error/offline-cache state.
	beforeLoad: async ({ context: { queryClient } }) => {
		try {
			const firstPage = await queryClient.ensureQueryData(
				groupsListQueryOptions({ page: 1, limit: PAGE_SIZE }),
			)

			if (firstPage.total === 0) {
				throw redirect({ to: "/groups/new" })
			}
		} catch (error) {
			if (isRedirect(error)) {
				throw error
			}
		}
	},
	component: DashboardPage,
})

function DashboardPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { data: user, isPending: userPending } = useMe()
	const logout = useLogout()
	const { page = 1, groupError } = Route.useSearch()
	const { data: groupsPage, isPending } = useGroups({
		page,
		limit: PAGE_SIZE,
	})

	useEffect(() => {
		if (groupError === "not-a-member") {
			toast.error(t("groups.dashboard.notAMember"))
			void navigate({ to: "/", search: {}, replace: true })
		}
	}, [groupError, navigate, t])

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

	const totalPages = groupsPage ? Math.max(1, Math.ceil(groupsPage.total / PAGE_SIZE)) : 1

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
								<AvatarFallback>
									{userPending ? "--" : (initials ?? "--")}
								</AvatarFallback>
							</Avatar>
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem asChild>
							<Link to="/settings/sessions">{t("auth.sessions.navLabel")}</Link>
						</DropdownMenuItem>
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
				<div className="mb-6 flex items-center justify-between">
					<h1 className="text-2xl font-semibold tracking-tight">
						{t("groups.dashboard.title")}
					</h1>
					<Button asChild>
						<Link to="/groups/new">{t("groups.dashboard.create")}</Link>
					</Button>
				</div>

				{isPending && (
					<div className="grid gap-3">
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-20 w-full" />
					</div>
				)}

				{!isPending && (
					<div className="grid gap-3">
						{groupsPage?.data.map((group) => <GroupCard key={group.id} group={group} />)}
					</div>
				)}

				{groupsPage && totalPages > 1 && (
					<div className="mt-6 flex items-center justify-center gap-3">
						<Button
							variant="outline"
							size="sm"
							disabled={page <= 1}
							onClick={() => void navigate({ to: "/", search: { page: page - 1 } })}
						>
							{t("groups.dashboard.previous")}
						</Button>
						<span className="text-muted-foreground text-sm">
							{t("groups.dashboard.pageOf", { page, totalPages })}
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={page >= totalPages}
							onClick={() => void navigate({ to: "/", search: { page: page + 1 } })}
						>
							{t("groups.dashboard.next")}
						</Button>
					</div>
				)}
			</main>
		</div>
	)
}

function GroupCard({ group }: { group: Group }) {
	const { t } = useTranslation()

	return (
		<Link to="/groups/$groupId" params={{ groupId: group.id }}>
			<Card className="hover:border-primary/50 transition-colors">
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<CardTitle className="text-base">{group.name}</CardTitle>
					{group.status === "CLOSED" && (
						<Badge variant="secondary">{t("groups.status.closed")}</Badge>
					)}
				</CardHeader>
				{group.description && (
					<CardContent>
						<p className="text-muted-foreground text-sm">{group.description}</p>
					</CardContent>
				)}
			</Card>
		</Link>
	)
}
