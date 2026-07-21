import { LayersIcon } from "lucide-react"

export function DashboardHeader() {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
				<LayersIcon className="h-3 w-3" aria-hidden />
				Synthèse multi-groupes
			</span>
			<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
				Mon portefeuille collectif
			</h1>
			<p className="max-w-2xl text-sm text-muted-foreground">
				Suivez la valorisation de vos parts, la performance des projets financés et
				l'activité de vos groupes, au même endroit.
			</p>
		</div>
	)
}
