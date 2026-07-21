import { Link } from "@tanstack/react-router"
import {
	ArrowLeftIcon,
	LayoutDashboardIcon,
	MailIcon,
	SettingsIcon,
	UsersIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "#/lib/utils.ts"
import type { Group } from "#/features/groups/schema"

interface GroupSidebarProps {
	groupId: string
	group: Group
}

export function GroupSidebar({ groupId, group }: GroupSidebarProps) {
	const { t } = useTranslation()
	const isClosed = group.status === "CLOSED"

	const navItems = [
		{
			to: "/groups/$groupId",
			label: t("groups.detail.dashboardTab"),
			icon: LayoutDashboardIcon,
			exact: true,
		},
		{
			to: "/groups/$groupId/members",
			label: t("groups.detail.membersTab"),
			icon: UsersIcon,
			exact: false,
		},
		{
			to: "/groups/$groupId/invites",
			label: t("groups.detail.invitesTab"),
			icon: MailIcon,
			exact: false,
		},
		{
			to: "/groups/$groupId/settings",
			label: t("groups.detail.settingsTab"),
			icon: SettingsIcon,
			exact: false,
		},
	] as const

	return (
		<aside className="flex w-full shrink-0 flex-col gap-4 border-border/60 bg-sidebar text-sidebar-foreground lg:h-[calc(100vh-3.5rem)] lg:w-64 lg:border-r lg:p-4">
			<Link
				to="/"
				className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden />
				{t("groups.sidebar.backToGroups")}
			</Link>

			<div className="flex flex-col gap-1">
				<span className="truncate text-sm font-semibold text-sidebar-foreground">
					{group.name}
				</span>
				<span
					className={cn(
						"inline-flex w-fit items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide",
						isClosed ? "bg-muted text-muted-foreground" : "bg-chart-4/10 text-chart-4",
					)}
				>
					{isClosed ? t("groups.status.closed") : "Actif"}
				</span>
			</div>

			<nav className="flex flex-col gap-1">
				{navItems.map((item) => (
					<Link
						key={item.to}
						to={item.to}
						params={{ groupId }}
						activeOptions={{ exact: item.exact }}
						className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
						activeProps={{
							className: "bg-sidebar-accent text-sidebar-accent-foreground",
						}}
					>
						<item.icon className="h-4 w-4 shrink-0" aria-hidden />
						{item.label}
					</Link>
				))}
			</nav>
		</aside>
	)
}
