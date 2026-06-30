import type { AuditLog } from '#/lib/api/workspaces.api'
import { workspacesApi } from '#/lib/api/workspaces.api'
import { useQuery } from '@tanstack/react-query'
import { ShieldIcon } from 'lucide-react'
import { useState } from 'react'

const EVENT_LABELS: Record<string, string> = {
	'workspace.created': 'Espace créé',
	'workspace.deleted': 'Espace supprimé',
	'member.invited': 'Invitation envoyée',
	'member.joined': 'Membre rejoint',
	'member.removed': 'Membre retiré',
	'member.role_updated': 'Rôle modifié',
	'cotisation.batch_recorded': 'Cotisations enregistrées',
	'vault.created': 'Coffre créé',
	'vault.archived': 'Coffre archivé',
	'flux.applied': 'Flux appliqué',
	'project.created': 'Projet créé',
	'vote.cast': 'Vote émis',
	'vote.closed': 'Vote clôturé',
	'auth.login': 'Connexion',
	'auth.2fa_enabled': '2FA activé',
	'auth.2fa_disabled': '2FA désactivé',
}

function fmtEvent(event: string) {
	return EVENT_LABELS[event] ?? event
}

function fmtDate(iso: string) {
	return new Date(iso).toLocaleString('fr-FR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export function AuditTab({ workspaceId }: { workspaceId: string }) {
	const [filter, setFilter] = useState('')

	const { data: logs = [], isLoading } = useQuery({
		queryKey: ['audit', workspaceId, filter || undefined],
		queryFn: () => workspacesApi.listAudit(workspaceId, { event: filter || undefined, limit: 200 }),
	})

	const eventTypes = Array.from(new Set(logs.map((l) => l.event))).sort()

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<h2 className="text-base font-semibold text-foreground">Journal d'audit ({logs.length})</h2>
				<select
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
					className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm cursor-pointer focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
				>
					<option value="">Tous les événements</option>
					{eventTypes.map((e) => (
						<option key={e} value={e}>{fmtEvent(e)}</option>
					))}
				</select>
			</div>

			{isLoading ? (
				<AuditSkeleton />
			) : logs.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<ShieldIcon className="size-6 text-primary" />
					</div>
					<p className="font-semibold text-foreground">Aucune entrée d'audit</p>
					<p className="text-sm text-muted-foreground max-w-sm">
						Toutes les actions importantes (connexions, modifications, votes…) seront tracées ici.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-border">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border bg-muted/40">
									<th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Date</th>
									<th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Événement</th>
									<th className="hidden px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Utilisateur</th>
									<th className="hidden px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">IP</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{logs.map((log) => (
									<AuditRow key={log.id} log={log} />
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	)
}

function AuditRow({ log }: { log: AuditLog }) {
	const [expanded, setExpanded] = useState(false)
	const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0

	return (
		<>
			<tr
				className={`bg-card transition-colors ${hasMetadata ? 'cursor-pointer hover:bg-muted/30' : ''}`}
				onClick={() => hasMetadata && setExpanded((p) => !p)}
			>
				<td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{fmtDate(log.createdAt)}</td>
				<td className="px-4 py-2.5">
					<span className="inline-flex items-center gap-1.5">
						<EventDot event={log.event} />
						<span className="text-xs font-medium text-foreground">{fmtEvent(log.event)}</span>
					</span>
				</td>
				<td className="hidden px-4 py-2.5 text-xs text-muted-foreground sm:table-cell">
					{log.userId ? log.userId.slice(0, 8) + '…' : '—'}
				</td>
				<td className="hidden px-4 py-2.5 text-xs text-muted-foreground lg:table-cell">
					{log.ipAddress ?? '—'}
				</td>
			</tr>
			{expanded && hasMetadata && (
				<tr className="bg-muted/20">
					<td colSpan={4} className="px-4 py-2.5">
						<pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
							{JSON.stringify(log.metadata, null, 2)}
						</pre>
					</td>
				</tr>
			)}
		</>
	)
}

function EventDot({ event }: { event: string }) {
	const color = event.startsWith('auth')
		? 'bg-amber-500'
		: event.includes('delete') || event.includes('removed') || event.includes('archived')
			? 'bg-red-500'
			: event.includes('created') || event.includes('joined')
				? 'bg-emerald-500'
				: 'bg-blue-500'
	return <span className={`inline-block size-1.5 rounded-full ${color}`} />
}

function AuditSkeleton() {
	return (
		<div className="space-y-2">
			{[0, 1, 2, 3, 4].map((i) => (
				<div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
			))}
		</div>
	)
}
