import { Link } from "@tanstack/react-router"
import { LayersIcon, PlusIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "#/components/ui/button"
import { cn } from "#/lib/utils.ts"

import { GroupCard } from "./group-card"
import { mockGroups, mockGroupStats } from "./mock-data"

const STATUS_FILTERS = [
	{ value: "all", label: "Tous" },
	{ value: "ACTIVE", label: "Actifs" },
	{ value: "CLOSED", label: "Clôturés" },
] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"]

export function GroupList() {
	const [filter, setFilter] = useState<StatusFilter>("all")

	const filteredGroups = mockGroups.filter(
		(group) => filter === "all" || group.status === filter,
	)

	return (
		<div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<h3 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider">
					<LayersIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
					Vos groupes
				</h3>

				<div className="flex items-center gap-3">
					<div
						role="group"
						aria-label="Filtrer les groupes par statut"
						className="flex items-center gap-0.5 rounded-full bg-muted p-1"
					>
						{STATUS_FILTERS.map((item) => (
							<button
								key={item.value}
								type="button"
								aria-pressed={filter === item.value}
								onClick={() => setFilter(item.value)}
								className={cn(
									"rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									filter === item.value
										? "bg-card text-foreground shadow-2xs"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{item.label}
							</button>
						))}
					</div>
					<span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
						{filteredGroups.length} / {mockGroups.length}
					</span>
					<Button asChild size="sm">
						<Link to="/groups/new">
							<PlusIcon aria-hidden />
							Créer un groupe
						</Link>
					</Button>
				</div>
			</div>

			{filteredGroups.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Aucun groupe {filter === "ACTIVE" ? "actif" : "clôturé"} pour le moment.
				</p>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredGroups.map((group) => {
						const stats = mockGroupStats(mockGroups.indexOf(group))
						return (
							<GroupCard
								key={group.id}
								group={group}
								invested={stats.invested}
								value={stats.value}
								membersCount={stats.membersCount}
								projectsCount={stats.projectsCount}
								openVotesCount={stats.openVotesCount}
							/>
						)
					})}
				</div>
			)}
		</div>
	)
}
