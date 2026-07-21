import { RouteIcon } from "lucide-react"

import {
	coffreRecords,
	FLOW_SOURCE_LABEL,
	RETIRABLE_DESTINATION_ID,
	type FlowRuleRecord,
} from "./mock-data"

function coffreName(coffreId: string) {
	if (coffreId === RETIRABLE_DESTINATION_ID) {
		return "Coffres rétirables des membres"
	}
	return coffreRecords.find((coffre) => coffre.id === coffreId)?.name ?? coffreId
}

interface GroupFlowRulesListProps {
	rules: FlowRuleRecord[]
}

export function GroupFlowRulesList({ rules }: GroupFlowRulesListProps) {
	return (
		<div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
			<h3 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider">
				<RouteIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
				Règles de flux
			</h3>
			<p className="mt-1 mb-4 text-xs text-muted-foreground">
				Comment chaque entrée d'argent se répartit automatiquement entre les coffres.
			</p>

			{rules.length === 0 && (
				<p className="text-sm text-muted-foreground">Aucune règle de flux configurée.</p>
			)}

			<ul className="space-y-3">
				{rules.map((rule) => (
					<li key={rule.id} className="rounded-xl border border-border/60 p-3">
						<span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-primary">
							{FLOW_SOURCE_LABEL[rule.source]}
						</span>
						<ul className="mt-2 space-y-1">
							{rule.destinations.map((destination) => (
								<li
									key={destination.coffreId}
									className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
								>
									<span>{coffreName(destination.coffreId)}</span>
									<span className="font-mono font-bold text-foreground">
										{destination.percentage}%
									</span>
								</li>
							))}
						</ul>
					</li>
				))}
			</ul>
		</div>
	)
}
