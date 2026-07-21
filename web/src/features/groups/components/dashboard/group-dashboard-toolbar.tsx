import { DownloadIcon, SearchIcon } from "lucide-react"

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select"
import type { Group } from "#/features/groups/schema"
import { cn } from "#/lib/utils.ts"

export type DashboardView = "group" | "member"
export type DashboardPeriod = "3M" | "6M" | "12M"

const VIEWS = [
	{ value: "group" as const, label: "Vue groupe" },
	{ value: "member" as const, label: "Vue membre" },
]

const PERIODS: { value: DashboardPeriod; label: string }[] = [
	{ value: "3M", label: "3 mois" },
	{ value: "6M", label: "6 mois" },
	{ value: "12M", label: "12 mois" },
]

interface GroupDashboardToolbarProps {
	group: Group
	view: DashboardView
	onViewChange: (view: DashboardView) => void
	period: DashboardPeriod
	onPeriodChange: (period: DashboardPeriod) => void
	search: string
	onSearchChange: (search: string) => void
	onExport: () => void
}

export function GroupDashboardToolbar({
	group,
	view,
	onViewChange,
	period,
	onPeriodChange,
	search,
	onSearchChange,
	onExport,
}: GroupDashboardToolbarProps) {
	const isClosed = group.status === "CLOSED"

	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-wrap items-center gap-2">
				<h1 className="text-lg font-bold tracking-tight text-foreground">{group.name}</h1>
				<span
					className={cn(
						"inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide",
						isClosed ? "bg-muted text-muted-foreground" : "bg-chart-4/10 text-chart-4",
					)}
				>
					{isClosed ? "Clôturé" : "Actif"}
				</span>
				<span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
					{group.currencyCode}
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<div className="relative">
					<SearchIcon
						className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<input
						type="search"
						value={search}
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder="Rechercher un membre..."
						aria-label="Rechercher un membre"
						className="h-8 w-40 rounded-md border border-input bg-transparent py-1 pr-2 pl-8 text-xs shadow-2xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:w-52"
					/>
				</div>

				<Select value={period} onValueChange={(value) => onPeriodChange(value as DashboardPeriod)}>
					<SelectTrigger className="h-8 w-28 text-xs" aria-label="Choisir la période">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PERIODS.map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div
					role="group"
					aria-label="Choisir la vue du tableau de bord"
					className="flex items-center gap-0.5 rounded-full bg-muted p-1"
				>
					{VIEWS.map((item) => (
						<button
							key={item.value}
							type="button"
							aria-pressed={view === item.value}
							onClick={() => onViewChange(item.value)}
							className={cn(
								"rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								view === item.value
									? "bg-card text-foreground shadow-2xs"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{item.label}
						</button>
					))}
				</div>

				<button
					type="button"
					onClick={onExport}
					className="flex h-8 items-center gap-1.5 rounded-md border border-input px-2.5 text-xs font-medium text-foreground shadow-2xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<DownloadIcon className="h-3.5 w-3.5" aria-hidden />
					Export
				</button>
			</div>
		</div>
	)
}
