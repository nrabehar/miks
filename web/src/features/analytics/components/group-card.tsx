import { Link } from "@tanstack/react-router"
import {
	ArrowDownRightIcon,
	ArrowUpRightIcon,
	ChevronRightIcon,
	FolderKanbanIcon,
	UsersIcon,
	VoteIcon,
} from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip"
import type { Group } from "#/features/groups/schema"
import { cn } from "#/lib/utils.ts"

interface GroupCardProps {
	group: Group
	invested: number
	value: number
	membersCount: number
	projectsCount: number
	openVotesCount: number
}

export function GroupCard({
	group,
	invested,
	value,
	membersCount,
	projectsCount,
	openVotesCount,
}: GroupCardProps) {
	const isClosed = group.status === "CLOSED"
	const isGain = value >= invested
	const gainPercent = invested > 0 ? ((value - invested) / invested) * 100 : 0
	const GainIcon = isGain ? ArrowUpRightIcon : ArrowDownRightIcon
	const statusLabel = isClosed ? "clôturé" : "actif"

	return (
		<Link
			to="/groups/$groupId"
			params={{ groupId: group.id }}
			aria-label={`${group.name}, groupe ${statusLabel}, valeur ${value.toLocaleString("fr-FR")} €, performance ${gainPercent >= 0 ? "+" : ""}${gainPercent.toFixed(1)} %`}
			className="group flex flex-col justify-between gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 flex-col gap-1">
					<span className="truncate text-sm font-semibold text-foreground" title={group.name}>
						{group.name}
					</span>
					<span className="text-xs text-muted-foreground">
						{group.currencyCode} · Depuis le{" "}
						{new Date(group.createdAt).toLocaleDateString("fr-FR")}
					</span>
				</div>
				<span
					className={cn(
						"inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide",
						isClosed ? "bg-muted text-muted-foreground" : "bg-chart-4/10 text-chart-4",
					)}
				>
					{isClosed ? "Clôturé" : "Actif"}
				</span>
			</div>

			<div className="grid grid-cols-3 gap-3">
				<div className="flex flex-col">
					<span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						Investi
					</span>
					<span className="font-mono text-sm font-bold text-foreground">
						{invested.toLocaleString("fr-FR")} €
					</span>
				</div>
				<div className="flex flex-col">
					<span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						Valeur
					</span>
					<span className="font-mono text-sm font-bold text-foreground">
						{value.toLocaleString("fr-FR")} €
					</span>
				</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="flex flex-col text-left">
							<span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
								Perf.
							</span>
							<span
								className={cn(
									"flex items-center gap-0.5 font-mono text-sm font-bold",
									isGain ? "text-chart-4" : "text-destructive",
								)}
							>
								<GainIcon className="h-3 w-3 shrink-0" aria-hidden />
								{Math.abs(gainPercent).toFixed(1)} %
							</span>
						</div>
					</TooltipTrigger>
					<TooltipContent>Plus-value de la valeur des parts par rapport au capital investi</TooltipContent>
				</Tooltip>
			</div>

			<div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
				<div className="flex items-center gap-3 text-xs text-muted-foreground">
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="flex items-center gap-1">
								<UsersIcon className="h-3.5 w-3.5" aria-hidden />
								{membersCount}
							</span>
						</TooltipTrigger>
						<TooltipContent>{membersCount} membres actifs</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="flex items-center gap-1">
								<FolderKanbanIcon className="h-3.5 w-3.5" aria-hidden />
								{projectsCount}
							</span>
						</TooltipTrigger>
						<TooltipContent>{projectsCount} projets financés</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<span
								className={cn(
									"flex items-center gap-1",
									openVotesCount > 0 && "font-semibold text-accent",
								)}
							>
								<VoteIcon className="h-3.5 w-3.5" aria-hidden />
								{openVotesCount}
							</span>
						</TooltipTrigger>
						<TooltipContent>
							{openVotesCount > 0
								? `${openVotesCount} scrutin(s) en cours`
								: "Aucun scrutin en cours"}
						</TooltipContent>
					</Tooltip>
				</div>
				<ChevronRightIcon
					className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
					aria-hidden
				/>
			</div>
		</Link>
	)
}
