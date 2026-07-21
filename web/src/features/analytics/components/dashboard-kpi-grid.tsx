import { ActivityIcon, BriefcaseIcon, LandmarkIcon, TrendingUpIcon } from "lucide-react"

import { KpiCard } from "#/components/dashboard/kpi-card"

export function DashboardKpiGrid() {
	return (
		<div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<KpiCard
				icon={LandmarkIcon}
				label="Total investi"
				value="112 000 €"
				detail="Cumul brut de vos apports dans tous vos groupes"
			/>
			<KpiCard
				icon={TrendingUpIcon}
				tone="positive"
				label="Valeur des parts"
				value="121 450 €"
				delta={{ label: "+9 450 € de plus-value", direction: "up" }}
			/>
			<KpiCard
				icon={ActivityIcon}
				tone="info"
				label="Performance projets"
				value="14,2 %"
				detail="15 900 € générés sur 112 000 € de revenus projets"
			/>
			<KpiCard
				icon={BriefcaseIcon}
				tone="accent"
				label="Groupes actifs"
				value="5"
				valueSuffix="/ 5"
				detail="12 projets actifs · 7 scrutins"
			/>
		</div>
	)
}
