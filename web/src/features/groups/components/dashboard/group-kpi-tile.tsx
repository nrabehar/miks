import type { LucideIcon } from "lucide-react"
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"

import { cn } from "#/lib/utils.ts"

export type KpiTone = "neutral" | "positive" | "info" | "accent"

interface KpiDelta {
	label: string
	direction?: "up" | "down"
}

interface GroupKpiTileProps {
	icon: LucideIcon
	tone?: KpiTone
	label: string
	value: string
	delta?: KpiDelta
	trend: number[]
}

// Tones map to our own theme tokens (src/index.css): `positive` reuses
// --chart-4 (the "gain" green used across the chart/table), `info` is the
// brand --primary blue, `accent` is the brand --accent orange.
const toneStyles: Record<
	KpiTone,
	{ card: string; iconWrap: string; icon: string; value: string; line: string }
> = {
	neutral: {
		card: "border-border/60 bg-card",
		iconWrap: "bg-muted",
		icon: "text-muted-foreground",
		value: "text-foreground",
		line: "var(--muted-foreground)",
	},
	positive: {
		card: "border-chart-4/20 bg-chart-4/5",
		iconWrap: "bg-chart-4/10",
		icon: "text-chart-4",
		value: "text-chart-4",
		line: "var(--chart-4)",
	},
	info: {
		card: "border-primary/20 bg-primary/5",
		iconWrap: "bg-primary/10",
		icon: "text-primary",
		value: "text-primary",
		line: "var(--primary)",
	},
	accent: {
		card: "border-accent/20 bg-accent/5",
		iconWrap: "bg-accent/10",
		icon: "text-accent",
		value: "text-accent",
		line: "var(--accent)",
	},
}

const deltaToneClasses: Record<"up" | "down", string> = {
	up: "text-chart-4",
	down: "text-destructive",
}

export function GroupKpiTile({
	icon: Icon,
	tone = "neutral",
	label,
	value,
	delta,
	trend,
}: GroupKpiTileProps) {
	const styles = toneStyles[tone]
	const DeltaIcon = delta?.direction === "down" ? ArrowDownRightIcon : ArrowUpRightIcon
	const data = trend.map((point, index) => ({ index, point }))
	const gradientId = `kpi-sparkline-${label.replace(/\s+/g, "-").toLowerCase()}`

	return (
		<div
			className={cn(
				"flex flex-col rounded-2xl border p-4 shadow-2xs transition-all hover:shadow-sm",
				styles.card,
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
					{label}
				</span>
				<span
					className={cn(
						"flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
						styles.iconWrap,
					)}
				>
					<Icon className={cn("h-3 w-3", styles.icon)} aria-hidden />
				</span>
			</div>

			<span className={cn("mt-1 font-mono text-xl font-black", styles.value)}>{value}</span>

			{delta && (
				<span
					className={cn(
						"mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold",
						deltaToneClasses[delta.direction ?? "up"],
					)}
				>
					<DeltaIcon className="h-3 w-3" aria-hidden />
					{delta.label}
				</span>
			)}

			<div className="mt-2 h-8 w-full" aria-hidden>
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
						<defs>
							<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={styles.line} stopOpacity={0.3} />
								<stop offset="95%" stopColor={styles.line} stopOpacity={0} />
							</linearGradient>
						</defs>
						<Area
							type="monotone"
							dataKey="point"
							stroke={styles.line}
							strokeWidth={1.5}
							fill={`url(#${gradientId})`}
							dot={false}
							isAnimationActive={false}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	)
}
