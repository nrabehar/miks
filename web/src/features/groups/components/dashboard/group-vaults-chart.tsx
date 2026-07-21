import { ActivityIcon } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { ChartLegendItem } from "#/components/dashboard/chart-legend-item"
import { ChartTooltip } from "#/components/dashboard/chart-tooltip"

import { coffreHistory, coffreRecords } from "./mock-data"

const COFFRE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

function formatEuro(value: unknown) {
	return `${Number(value).toLocaleString("fr-FR")} €`
}

export function GroupVaultsChart() {
	return (
		<div className="flex min-h-80 flex-col justify-between rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
			<h3 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider">
				<ActivityIcon className="h-4 w-4 text-primary" aria-hidden />
				Évolution du capital par coffre
			</h3>
			<div className="h-64 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={coffreHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
						<XAxis
							dataKey="month"
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
						<Tooltip content={<ChartTooltip valueFormatter={formatEuro} />} />
						{coffreRecords.map((coffre, index) => (
							<Area
								key={coffre.id}
								name={coffre.name}
								type="monotone"
								dataKey={coffre.id}
								stroke={COFFRE_COLORS[index % COFFRE_COLORS.length]}
								strokeWidth={2}
								fillOpacity={0.12}
								fill={COFFRE_COLORS[index % COFFRE_COLORS.length]}
								dot={false}
								activeDot={{ r: 3.5, strokeWidth: 2, stroke: "var(--card)" }}
							/>
						))}
					</AreaChart>
				</ResponsiveContainer>
			</div>
			<div className="flex flex-wrap items-center justify-center gap-4">
				{coffreRecords.map((coffre, index) => (
					<ChartLegendItem
						key={coffre.id}
						color={COFFRE_COLORS[index % COFFRE_COLORS.length]}
						label={coffre.name}
					/>
				))}
			</div>
		</div>
	)
}
