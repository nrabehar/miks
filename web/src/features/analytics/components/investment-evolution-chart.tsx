import { ActivityIcon } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { ChartLegendItem } from "#/components/dashboard/chart-legend-item"
import { ChartTooltip } from "#/components/dashboard/chart-tooltip"
import { investmentHistory } from "./mock-data"

function formatEuro(value: unknown) {
	return `${Number(value).toLocaleString("fr-FR")} €`
}

export function InvestmentEvolutionChart() {
	return (
		<div className="flex min-h-90 flex-col justify-between rounded-2xl border border-border/60 bg-card p-6 shadow-sm lg:col-span-2">
			<div>
				<div className="flex items-center justify-between">
					<h3 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider">
						<ActivityIcon className="h-4 w-4 text-primary" aria-hidden />
						Évolution des investissements
					</h3>
					<span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
						Mensuel
					</span>
				</div>
				<p className="mt-1 mb-6 text-xs leading-relaxed text-muted-foreground">
					Apports cumulés comparés à la valorisation théorique en temps réel de vos parts.
				</p>
			</div>
			<div className="h-64 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={investmentHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
						<defs>
							<linearGradient id="gradientInvested" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
								<stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
							</linearGradient>
							<linearGradient id="gradientValue" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="var(--chart-4)" stopOpacity={0.25} />
								<stop offset="95%" stopColor="var(--chart-4)" stopOpacity={0} />
							</linearGradient>
						</defs>
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
						<Area
							name="Apports cumulés"
							type="monotone"
							dataKey="invested"
							stroke="var(--chart-1)"
							strokeWidth={2}
							fillOpacity={1}
							fill="url(#gradientInvested)"
							dot={false}
							activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
						/>
						<Area
							name="Valeur théorique"
							type="monotone"
							dataKey="theoreticalValue"
							stroke="var(--chart-4)"
							strokeWidth={2.5}
							fillOpacity={1}
							fill="url(#gradientValue)"
							dot={false}
							activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
			<div className="mt-4 flex items-center justify-center gap-5">
				<ChartLegendItem color="var(--chart-1)" label="Apports cumulés" />
				<ChartLegendItem color="var(--chart-4)" label="Valeur théorique" />
			</div>
		</div>
	)
}
