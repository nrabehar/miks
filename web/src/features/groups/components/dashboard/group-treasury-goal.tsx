import { TargetIcon } from "lucide-react"

import { cn } from "#/lib/utils.ts"

import { groupKpis } from "./mock-data"

interface GroupTreasuryGoalProps {
	className?: string
}

export function GroupTreasuryGoal({ className }: GroupTreasuryGoalProps) {
	const progress = Math.min(100, Math.round((groupKpis.treasury / groupKpis.treasuryGoal) * 100))
	const remaining = Math.max(0, groupKpis.treasuryGoal - groupKpis.treasury)

	return (
		<div
			className={cn(
				"flex flex-col justify-between gap-3 rounded-2xl border border-border/60 bg-card p-5 shadow-sm",
				className,
			)}
		>
			<h3 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider">
				<TargetIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
				Objectif de trésorerie
			</h3>

			<div className="flex flex-col gap-3">
				<div className="flex items-baseline justify-between">
					<span className="text-xs text-muted-foreground">
						{groupKpis.treasury.toLocaleString("fr-FR")} € / {groupKpis.treasuryGoal.toLocaleString("fr-FR")} €
					</span>
					<span className="font-mono text-lg font-bold text-foreground">{progress}%</span>
				</div>

				<div
					className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
					role="progressbar"
					aria-valuenow={progress}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label="Progression vers l'objectif de trésorerie"
				>
					<div
						className="h-full rounded-full bg-linear-to-r from-primary to-accent"
						style={{ width: `${progress}%` }}
					/>
				</div>

				<p className="text-[11px] text-muted-foreground">
					Il reste {remaining.toLocaleString("fr-FR")} € pour atteindre l'objectif.
				</p>
			</div>
		</div>
	)
}
