import { useMemo, useState } from "react"

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table"
import { cn } from "#/lib/utils.ts"

import type { DashboardPeriod } from "./group-dashboard-toolbar"
import type { ActivityType } from "./mock-data"
import { activityRecords } from "./mock-data"

const PERIOD_MONTHS: Record<DashboardPeriod, number> = {
	"3M": 3,
	"6M": 6,
	"12M": 12,
}

const TYPE_FILTERS: { value: "all" | ActivityType; label: string }[] = [
	{ value: "all", label: "Tous les types" },
	{ value: "contribution", label: "Apports" },
	{ value: "vote", label: "Scrutins" },
	{ value: "project", label: "Projets" },
	{ value: "member", label: "Membres" },
]

const TYPE_LABEL: Record<ActivityType, string> = {
	contribution: "Apport",
	vote: "Scrutin",
	project: "Projet",
	member: "Membre",
}

const TYPE_TONE: Record<ActivityType, string> = {
	contribution: "bg-chart-4/10 text-chart-4",
	vote: "bg-accent/10 text-accent",
	project: "bg-primary/10 text-primary",
	member: "bg-muted text-muted-foreground",
}

interface GroupActivityTableProps {
	period: DashboardPeriod
}

export function GroupActivityTable({ period }: GroupActivityTableProps) {
	const [typeFilter, setTypeFilter] = useState<"all" | ActivityType>("all")

	const rows = useMemo(() => {
		const monthsToShow = PERIOD_MONTHS[period]
		const cutoff = new Date()
		cutoff.setMonth(cutoff.getMonth() - monthsToShow)

		return activityRecords
			.filter((event) => new Date(event.date) >= cutoff)
			.filter((event) => typeFilter === "all" || event.type === typeFilter)
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
	}, [period, typeFilter])

	return (
		<div className="rounded-2xl border border-border/60 bg-card shadow-sm">
			<div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
				<p className="text-xs text-muted-foreground">
					{rows.length} événement{rows.length > 1 ? "s" : ""} sur la période sélectionnée
				</p>
				<Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
					<SelectTrigger className="h-8 w-36 text-xs" aria-label="Filtrer par type">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{TYPE_FILTERS.map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Description</TableHead>
						<TableHead className="text-right">Montant</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.length === 0 && (
						<TableRow>
							<TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
								Aucun événement pour ce filtre.
							</TableCell>
						</TableRow>
					)}
					{rows.map((event) => (
						<TableRow key={event.id}>
							<TableCell className="text-xs text-muted-foreground">
								{new Date(event.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
							</TableCell>
							<TableCell>
								<span
									className={cn(
										"inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide",
										TYPE_TONE[event.type],
									)}
								>
									{TYPE_LABEL[event.type]}
								</span>
							</TableCell>
							<TableCell className="text-xs text-foreground">{event.description}</TableCell>
							<TableCell className="text-right font-mono text-xs font-bold text-foreground">
								{event.amount != null ? `${event.amount.toLocaleString("fr-FR")} €` : "—"}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
