import { workspacesApi, type Cotisation } from '#/lib/api/workspaces.api'
import { useQuery } from '@tanstack/react-query'
import { ReceiptIcon } from 'lucide-react'
import { useState } from 'react'

export function CotisationsTab({
	workspaceId,
	currency,
}: {
	workspaceId: string
	currency: string
}) {
	const [selectedPeriod, setSelectedPeriod] = useState<string>('all')

	const { data: cotisations = [], isLoading } = useQuery({
		queryKey: ['workspace-cotisations', workspaceId],
		queryFn: () => workspacesApi.getCotisations(workspaceId),
	})

	const periods = [...new Set(cotisations.map((c) => c.period ?? 'Sans période'))].sort().reverse()

	const filtered =
		selectedPeriod === 'all'
			? cotisations
			: cotisations.filter((c) => (c.period ?? 'Sans période') === selectedPeriod)

	const grouped = filtered.reduce<Record<string, Cotisation[]>>((acc, c) => {
		const key = c.period ?? 'Sans période'
		;(acc[key] ??= []).push(c)
		return acc
	}, {})

	const groupedPeriods = Object.keys(grouped).sort().reverse()

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<h2 className="text-base font-semibold text-foreground">Historique des cotisations</h2>

				{periods.length > 0 && (
					<select
						value={selectedPeriod}
						onChange={(e) => setSelectedPeriod(e.target.value)}
						className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
					>
						<option value="all">Toutes les périodes</option>
						{periods.map((p) => (
							<option key={p} value={p}>
								{formatPeriod(p)}
							</option>
						))}
					</select>
				)}
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
					))}
				</div>
			) : filtered.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
					<ReceiptIcon className="size-6 text-muted-foreground/40" />
					<p className="text-sm text-muted-foreground">
						{selectedPeriod !== 'all'
							? 'Aucune cotisation pour cette période.'
							: 'Aucune cotisation enregistrée.'}
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{groupedPeriods.map((p) => {
						const rows = grouped[p]
						const total = rows.reduce((sum, c) => sum + Number(c.amount), 0)
						return (
							<section key={p} aria-label={formatPeriod(p)}>
								<div className="mb-2 flex items-center gap-2">
									<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										{formatPeriod(p)}
									</span>
									<div className="h-px flex-1 bg-border" />
									<span className="text-xs font-semibold tabular-nums text-muted-foreground">
										{fmtAmount(total, rows[0]?.currency || currency)}
									</span>
								</div>
								<div className="overflow-hidden rounded-xl border border-border bg-card">
									{rows.map((c, i) => (
										<CotisationRow
											key={c.id}
											cotisation={c}
											currency={currency}
											isLast={i === rows.length - 1}
										/>
									))}
								</div>
							</section>
						)
					})}
				</div>
			)}
		</div>
	)
}

function CotisationRow({
	cotisation,
	currency,
	isLast,
}: {
	cotisation: Cotisation
	currency: string
	isLast: boolean
}) {
	const u = cotisation.member?.user
	const name =
		[u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || '—'
	const initials = name
		.split(/[\s@._-]/)
		.filter(Boolean)
		.slice(0, 2)
		.map((s) => s[0]?.toUpperCase() ?? '')
		.join('')
	const date = new Date(cotisation.createdAt).toLocaleDateString('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})

	return (
		<div
			className={`flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-border/60' : ''}`}
		>
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
				{initials}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">{name}</p>
				{cotisation.note && (
					<p className="truncate text-xs text-muted-foreground">{cotisation.note}</p>
				)}
			</div>
			<div className="text-right shrink-0">
				<p className="text-sm font-semibold text-foreground tabular-nums">
					{fmtAmount(Number(cotisation.amount), cotisation.currency || currency)}
				</p>
				<p className="text-[10px] text-muted-foreground">{date}</p>
			</div>
		</div>
	)
}

function fmtAmount(value: number, currency: string): string {
	return `${value.toLocaleString('fr-MG')} ${currency}`
}

function formatPeriod(period: string): string {
	if (period === 'Sans période') return period
	// Handle "YYYY-MM" format
	const match = period.match(/^(\d{4})-(\d{2})$/)
	if (match) {
		const date = new Date(Number(match[1]), Number(match[2]) - 1)
		return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
	}
	return period
}
