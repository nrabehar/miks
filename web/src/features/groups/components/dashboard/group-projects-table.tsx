import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import { useMemo, useState } from "react"

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table"
import { cn } from "#/lib/utils.ts"

import type { GroupProjectRecord } from "./mock-data"

type SortKey = "name" | "budget" | "gains" | "roi"
type SortDirection = "asc" | "desc"

const COLUMNS: { key: SortKey; label: string }[] = [
	{ key: "name", label: "Projet" },
	{ key: "budget", label: "Budget alloué" },
	{ key: "gains", label: "Gains réels" },
	{ key: "roi", label: "ROI" },
]

const STATUS_LABEL: Record<GroupProjectRecord["status"], string> = {
	EN_ATTENTE: "En attente",
	EN_COURS: "En cours",
	TERMINE: "Terminé",
}

const STATUS_TONE: Record<GroupProjectRecord["status"], string> = {
	EN_ATTENTE: "bg-muted text-muted-foreground",
	EN_COURS: "bg-primary/10 text-primary",
	TERMINE: "bg-chart-4/10 text-chart-4",
}

interface GroupProjectsTableProps {
	projects: GroupProjectRecord[]
}

export function GroupProjectsTable({ projects }: GroupProjectsTableProps) {
	const [sortKey, setSortKey] = useState<SortKey>("roi")
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

	const rows = useMemo(() => {
		const withRoi = projects.map((project) => ({
			...project,
			roi: project.status === "EN_ATTENTE" ? null : ((project.gains - project.budget) / project.budget) * 100,
		}))

		return [...withRoi].sort((a, b) => {
			let comparison: number
			if (sortKey === "name") comparison = a.name.localeCompare(b.name)
			else if (sortKey === "budget") comparison = a.budget - b.budget
			else if (sortKey === "gains") comparison = a.gains - b.gains
			else comparison = (a.roi ?? -Infinity) - (b.roi ?? -Infinity)

			return sortDirection === "asc" ? comparison : -comparison
		})
	}, [projects, sortKey, sortDirection])

	function toggleSort(key: SortKey) {
		if (key === sortKey) {
			setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
		} else {
			setSortKey(key)
			setSortDirection("desc")
		}
	}

	return (
		<div className="rounded-2xl border border-border/60 bg-card shadow-sm">
			<Table>
				<TableHeader>
					<TableRow>
						{COLUMNS.map((column) => (
							<TableHead key={column.key} className={column.key !== "name" ? "text-right" : ""}>
								<button
									type="button"
									onClick={() => toggleSort(column.key)}
									className={cn(
										"inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground",
										column.key !== "name" && "flex-row-reverse",
									)}
								>
									{column.label}
									{sortKey === column.key ? (
										sortDirection === "asc" ? (
											<ArrowUpIcon className="h-3 w-3" aria-hidden />
										) : (
											<ArrowDownIcon className="h-3 w-3" aria-hidden />
										)
									) : (
										<ArrowUpDownIcon className="h-3 w-3 opacity-40" aria-hidden />
									)}
								</button>
							</TableHead>
						))}
						<TableHead>Statut</TableHead>
						<TableHead>Progression</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.length === 0 && (
						<TableRow>
							<TableCell colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
								Aucun projet pour le moment.
							</TableCell>
						</TableRow>
					)}
					{rows.map((project) => {
						const isGain = (project.roi ?? 0) >= 0
						const utilization =
							project.status === "EN_ATTENTE"
								? 0
								: Math.min(100, Math.round((project.gains / project.budget) * 100))

						return (
							<TableRow key={project.id}>
								<TableCell className="text-xs font-medium text-foreground">{project.name}</TableCell>
								<TableCell className="text-right font-mono text-xs text-muted-foreground">
									{project.budget.toLocaleString("fr-FR")} €
								</TableCell>
								<TableCell className="text-right font-mono text-xs font-bold text-foreground">
									{project.status === "EN_ATTENTE" ? "—" : `${project.gains.toLocaleString("fr-FR")} €`}
								</TableCell>
								<TableCell
									className={cn(
										"text-right font-mono text-xs font-bold",
										project.roi == null ? "text-muted-foreground" : isGain ? "text-chart-4" : "text-destructive",
									)}
								>
									{project.roi == null ? "—" : `${isGain ? "+" : ""}${project.roi.toFixed(0)} %`}
								</TableCell>
								<TableCell>
									<span
										className={cn(
											"inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide",
											STATUS_TONE[project.status],
										)}
									>
										{STATUS_LABEL[project.status]}
									</span>
								</TableCell>
								<TableCell className="w-32">
									<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<div
											className={cn(
												"h-full rounded-full",
												project.roi == null ? "bg-muted-foreground/40" : isGain ? "bg-chart-4" : "bg-destructive",
											)}
											style={{ width: `${utilization}%` }}
										/>
									</div>
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
		</div>
	)
}
