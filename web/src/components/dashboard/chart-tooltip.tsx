import type { TooltipContentProps } from "recharts"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"

interface ChartTooltipProps extends Partial<TooltipContentProps<ValueType, NameType>> {
	valueFormatter?: (value: ValueType) => string
}

export function ChartTooltip({ active, payload, label, valueFormatter }: ChartTooltipProps) {
	if (!active || !payload || payload.length === 0) {
		return null
	}

	return (
		<div className="rounded-xl border border-border bg-popover/95 p-3 shadow-lg backdrop-blur-md">
			{label != null && (
				<p className="mb-1.5 border-b border-border pb-1 font-mono text-[11px] font-bold text-foreground">
					{label}
				</p>
			)}
			<div className="space-y-1">
				{payload.map((entry) => (
					<div key={String(entry.dataKey ?? entry.name)} className="flex items-center justify-between gap-4">
						<span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
							<span
								className="h-1.5 w-1.5 rounded-full"
								style={{ backgroundColor: entry.color }}
								aria-hidden
							/>
							{entry.name}
						</span>
						<span className="font-mono text-[11px] font-bold text-foreground">
							{valueFormatter && entry.value != null ? valueFormatter(entry.value) : entry.value}
						</span>
					</div>
				))}
			</div>
		</div>
	)
}
