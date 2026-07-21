import { BarChart3Icon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { ChartLegendItem } from "#/components/dashboard/chart-legend-item"
import { ChartTooltip } from "#/components/dashboard/chart-tooltip"
import { budgetEfficiency } from "./mock-data"

function formatEuro(value: unknown) {
	return `${Number(value).toLocaleString("fr-FR")} €`
}

export function BudgetEfficiencyChart() {
	return (
		<div className="flex min-h-80 flex-col justify-between rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
			<div>
				<h3 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider">
					<BarChart3Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
					Efficacité budgétaire des projets
				</h3>
				<p className="mt-1 mb-6 text-xs leading-relaxed text-muted-foreground">
					Budget alloué par le groupe face aux gains réels collectés et redistribués.
				</p>
			</div>
			<div className="h-64 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={budgetEfficiency} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={2}>
						<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
						<XAxis
							dataKey="project"
							stroke="var(--muted-foreground)"
							fontSize={10}
							tickLine={false}
							axisLine={false}
							dy={10}
						/>
						<YAxis
							stroke="var(--muted-foreground)"
							fontSize={10}
							tickLine={false}
							axisLine={false}
							width={48}
							tickFormatter={(value: number) => `${value / 1000}k €`}
						/>
						<Tooltip
							cursor={{ fill: "var(--muted)", opacity: 0.4 }}
							content={<ChartTooltip valueFormatter={formatEuro} />}
						/>
						<Bar name="Budget alloué" dataKey="budget" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
						<Bar name="Gains réels" dataKey="gains" fill="var(--chart-4)" radius={[4, 4, 0, 0]} maxBarSize={22} />
					</BarChart>
				</ResponsiveContainer>
			</div>
			<div className="mt-4 flex items-center justify-center gap-5">
				<ChartLegendItem color="var(--chart-1)" label="Budget alloué" />
				<ChartLegendItem color="var(--chart-4)" label="Gains réels" />
			</div>
		</div>
	)
}
