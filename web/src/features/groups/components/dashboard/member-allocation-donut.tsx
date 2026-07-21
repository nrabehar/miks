import { PieChartIcon } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { ChartTooltip } from "#/components/dashboard/chart-tooltip"

import { memberRecords } from "./mock-data"

const CATEGORICAL_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]
const OTHER_COLOR = "var(--muted-foreground)"
const OTHER_NAME = "Autres membres"

function formatEuro(value: unknown) {
	return `${Number(value).toLocaleString("fr-FR")} €`
}

export function MemberAllocationDonut() {
	const active = memberRecords
		.filter((member) => member.status === "ACTIVE")
		.sort((a, b) => b.value - a.value)
	const total = active.reduce((sum, member) => sum + member.value, 0)

	const top = active.slice(0, 4)
	const otherValue = active.slice(4).reduce((sum, member) => sum + member.value, 0)
	const slices = otherValue > 0 ? [...top, { name: OTHER_NAME, value: otherValue }] : top

	function colorFor(name: string, index: number) {
		return name === OTHER_NAME ? OTHER_COLOR : CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
	}

	return (
		<div className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
			<h3 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider">
				<PieChartIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
				Répartition des parts
			</h3>
			<div className="mt-4 flex items-center gap-4">
				<div className="relative h-28 w-28 shrink-0">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Tooltip content={<ChartTooltip valueFormatter={formatEuro} />} />
							<Pie
								data={slices}
								dataKey="value"
								nameKey="name"
								innerRadius={38}
								outerRadius={54}
								paddingAngle={2}
								strokeWidth={2}
								stroke="var(--card)"
							>
								{slices.map((entry, index) => (
									<Cell key={entry.name} fill={colorFor(entry.name, index)} />
								))}
							</Pie>
						</PieChart>
					</ResponsiveContainer>
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
						<span className="font-mono text-sm font-black text-foreground">
							{total.toLocaleString("fr-FR")} €
						</span>
						<span className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
							Total
						</span>
					</div>
				</div>
				<ul className="min-w-0 flex-1 space-y-1.5">
					{slices.map((entry, index) => (
						<li key={entry.name} className="flex items-center justify-between gap-2 text-[11px]">
							<span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
								<span
									className="h-1.5 w-1.5 shrink-0 rounded-full"
									style={{ backgroundColor: colorFor(entry.name, index) }}
									aria-hidden
								/>
								<span className="truncate">{entry.name}</span>
							</span>
							<span className="shrink-0 font-mono font-bold text-foreground">
								{Math.round((entry.value / total) * 100)}%
							</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
