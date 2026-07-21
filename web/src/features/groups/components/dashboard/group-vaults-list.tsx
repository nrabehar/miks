import { VaultIcon } from "lucide-react"

import { coffreRecords } from "./mock-data"

const COFFRE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

export function GroupVaultsList() {
	const total = coffreRecords.reduce((sum, coffre) => sum + coffre.balance, 0)

	return (
		<div className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
			<h3 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider">
				<VaultIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
				Coffres du groupe
			</h3>
			<ul className="mt-4 space-y-3">
				{coffreRecords.map((coffre, index) => {
					const share = (coffre.balance / total) * 100
					const color = COFFRE_COLORS[index % COFFRE_COLORS.length]
					return (
						<li key={coffre.id} className="flex flex-col gap-1">
							<div className="flex items-center justify-between gap-2 text-xs">
								<span className="flex items-center gap-1.5 font-medium text-foreground">
									<span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
									{coffre.name}
								</span>
								<span className="font-mono font-bold text-foreground">
									{coffre.balance.toLocaleString("fr-FR")} €
								</span>
							</div>
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full"
									style={{ width: `${share}%`, backgroundColor: color }}
								/>
							</div>
						</li>
					)
				})}
			</ul>
			<div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
				<span className="font-mono font-bold uppercase tracking-wide text-muted-foreground">Total</span>
				<span className="font-mono text-sm font-black text-foreground">
					{total.toLocaleString("fr-FR")} €
				</span>
			</div>
		</div>
	)
}
