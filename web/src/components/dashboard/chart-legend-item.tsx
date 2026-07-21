interface ChartLegendItemProps {
	color: string
	label: string
}

export function ChartLegendItem({ color, label }: ChartLegendItemProps) {
	return (
		<span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
			<span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
			{label}
		</span>
	)
}
