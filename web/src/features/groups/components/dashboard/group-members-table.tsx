import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Avatar, AvatarFallback } from "#/components/ui/avatar"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table"
import { cn } from "#/lib/utils.ts"

import { memberInitials, memberRecords } from "./mock-data"

type SortKey = "name" | "value" | "share" | "joinedAt"
type SortDirection = "asc" | "desc"

interface GroupMembersTableProps {
	search: string
}

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
	{ key: "name", label: "Membre" },
	{ key: "value", label: "Parts", align: "right" },
	{ key: "share", label: "% du groupe", align: "right" },
	{ key: "joinedAt", label: "Rejoint le", align: "right" },
]

export function GroupMembersTable({ search }: GroupMembersTableProps) {
	const [sortKey, setSortKey] = useState<SortKey>("value")
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

	const totalActiveValue = useMemo(
		() =>
			memberRecords
				.filter((member) => member.status === "ACTIVE")
				.reduce((sum, member) => sum + member.value, 0),
		[],
	)

	const rows = useMemo(() => {
		const filtered = memberRecords.filter((member) =>
			member.name.toLowerCase().includes(search.trim().toLowerCase()),
		)

		const withShare = filtered.map((member) => ({
			...member,
			share: (member.value / totalActiveValue) * 100,
		}))

		const sorted = [...withShare].sort((a, b) => {
			let comparison: number
			if (sortKey === "name") comparison = a.name.localeCompare(b.name)
			else if (sortKey === "value") comparison = a.value - b.value
			else if (sortKey === "share") comparison = a.share - b.share
			else comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()

			return sortDirection === "asc" ? comparison : -comparison
		})

		return sorted
	}, [search, sortKey, sortDirection, totalActiveValue])

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
							<TableHead key={column.key} className={column.align === "right" ? "text-right" : ""}>
								<button
									type="button"
									onClick={() => toggleSort(column.key)}
									className={cn(
										"inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground",
										column.align === "right" && "flex-row-reverse",
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
						<TableHead className="text-right">
							<span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
								Statut
							</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.length === 0 && (
						<TableRow>
							<TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
								Aucun membre ne correspond à cette recherche.
							</TableCell>
						</TableRow>
					)}
					{rows.map((member) => {
						const isMe = member.id === "mem-you"
						return (
							<TableRow key={member.id} className={cn(isMe && "bg-accent/5")}>
								<TableCell>
									<div className="flex items-center gap-2">
										<Avatar size="sm">
											<AvatarFallback className={cn(isMe && "bg-accent/20 font-semibold text-accent")}>
												{memberInitials(member.name)}
											</AvatarFallback>
										</Avatar>
										<span className="text-xs font-medium text-foreground">{member.name}</span>
									</div>
								</TableCell>
								<TableCell className="text-right font-mono text-xs font-bold text-foreground">
									{member.value.toLocaleString("fr-FR")} €
								</TableCell>
								<TableCell className="text-right font-mono text-xs text-muted-foreground">
									{member.status === "ACTIVE" ? `${member.share.toFixed(1)} %` : "—"}
								</TableCell>
								<TableCell className="text-right text-xs text-muted-foreground">
									{new Date(member.joinedAt).toLocaleDateString("fr-FR")}
								</TableCell>
								<TableCell className="text-right">
									<span
										className={cn(
											"inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide",
											member.status === "ACTIVE"
												? "bg-chart-4/10 text-chart-4"
												: "bg-muted text-muted-foreground",
										)}
									>
										{member.status === "ACTIVE" ? "Actif" : "Parti"}
									</span>
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
		</div>
	)
}
