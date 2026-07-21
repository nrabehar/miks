import { PieChartIcon } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { clubShares } from "./mock-data"
import { ChartTooltip } from "#/components/dashboard/chart-tooltip"

const CLUB_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]
const OTHER_COLOR = "var(--muted-foreground)"

function colorFor(name: string, index: number) {
	return name === "Autres" ? OTHER_COLOR : CLUB_COLORS[index % CLUB_COLORS.length]
}

function formatEuro(value: unknown) {
	return `${Number(value).toLocaleString("fr-FR")} €`
}

export function ClubDistributionChart() {
	const total = clubShares.reduce((sum, club) => sum + club.value, 0)

	return (
		<div className="flex min-h-90 flex-col justify-between rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
			<div>
				<h3 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider">
					<PieChartIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
					Répartition par club
				</h3>
				<p className="mt-1 mb-6 text-xs leading-relaxed text-muted-foreground">
					Distribution proportionnelle de la valeur consolidée de vos parts.
				</p>
			</div>
			<div className="relative h-44 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Tooltip content={<ChartTooltip valueFormatter={formatEuro} />} />
						<Pie
							data={clubShares}
							dataKey="value"
							nameKey="name"
							innerRadius={52}
							outerRadius={74}
							paddingAngle={2}
							strokeWidth={2}
							stroke="var(--card)"
						>
							{clubShares.map((entry, index) => (
								<Cell key={entry.name} fill={colorFor(entry.name, index)} />
							))}
						</Pie>
					</PieChart>
				</ResponsiveContainer>
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
					<span className="font-mono text-lg font-black text-foreground">
						{total.toLocaleString("fr-FR")} €
					</span>
					<span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
						Valeur totale
					</span>
				</div>
			</div>
			<ul className="mt-4 space-y-1.5">
				{clubShares.map((entry, index) => (
					<li key={entry.name} className="flex items-center justify-between gap-2 text-[11px]">
						<span className="flex items-center gap-1.5 text-muted-foreground">
							<span
								className="h-1.5 w-1.5 rounded-full"
								style={{ backgroundColor: colorFor(entry.name, index) }}
								aria-hidden
							/>
							{entry.name}
						</span>
						<span className="font-mono font-bold text-foreground">
							{Math.round((entry.value / total) * 100)}%
						</span>
					</li>
				))}
			</ul>
		</div>
	)
}
