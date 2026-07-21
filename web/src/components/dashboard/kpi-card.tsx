import type { LucideIcon } from "lucide-react"
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react"

import { cn } from "#/lib/utils.ts"

export type KpiTone = "neutral" | "positive" | "info" | "accent"

interface KpiDelta {
	label: string
	direction?: "up" | "down"
}

interface KpiCardProps {
	icon: LucideIcon
	tone?: KpiTone
	label: string
	value: string
	valueSuffix?: string
	delta?: KpiDelta
	detail?: string
}

// Tones map to our own theme tokens (src/index.css), never ad-hoc Tailwind
// hues, so the cards stay correct across light/dark automatically: `positive`
// reuses --chart-4 (the same "gain" green the evolution/budget charts already
// draw with), `info` is the brand --primary blue, `accent` is the brand
// --accent orange — one card, used sparingly, per design.md.
const toneStyles: Record<
	KpiTone,
	{ card: string; iconWrap: string; icon: string; value: string }
> = {
	neutral: {
		card: "border-border/60 bg-card",
		iconWrap: "bg-muted",
		icon: "text-muted-foreground",
		value: "text-foreground",
	},
	positive: {
		card: "border-chart-4/20 bg-chart-4/5",
		iconWrap: "bg-chart-4/10",
		icon: "text-chart-4",
		value: "text-chart-4",
	},
	info: {
		card: "border-primary/20 bg-primary/5",
		iconWrap: "bg-primary/10",
		icon: "text-primary",
		value: "text-primary",
	},
	accent: {
		card: "border-accent/20 bg-accent/5",
		iconWrap: "bg-accent/10",
		icon: "text-accent",
		value: "text-accent",
	},
}

const deltaToneClasses: Record<"up" | "down", string> = {
	up: "text-chart-4",
	down: "text-destructive",
}

export function KpiCard({
	icon: Icon,
	tone = "neutral",
	label,
	value,
	valueSuffix,
	delta,
	detail,
}: KpiCardProps) {
	const styles = toneStyles[tone]
	const DeltaIcon = delta?.direction === "down" ? ArrowDownRightIcon : ArrowUpRightIcon

	return (
		<div className={cn("rounded-2xl border p-5 shadow-2xs transition-all hover:shadow-sm", styles.card)}>
			<div className="flex items-start justify-between gap-2">
				<span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
					{label}
				</span>
				<span
					className={cn(
						"flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
						styles.iconWrap,
					)}
				>
					<Icon className={cn("h-3.5 w-3.5", styles.icon)} aria-hidden />
				</span>
			</div>

			<div className="mt-2 flex items-baseline gap-1">
				<span className={cn("font-mono text-2xl font-black", styles.value)}>{value}</span>
				{valueSuffix && (
					<span className="font-mono text-sm font-bold text-muted-foreground">{valueSuffix}</span>
				)}
			</div>

			{delta && (
				<span
					className={cn(
						"mt-1 flex items-center gap-0.5 text-xs font-semibold",
						deltaToneClasses[delta.direction ?? "up"],
					)}
				>
					<DeltaIcon className="h-3 w-3" aria-hidden />
					{delta.label}
				</span>
			)}

			{detail && (
				<span className="mt-1 block text-xs font-medium text-muted-foreground">{detail}</span>
			)}
		</div>
	)
}
