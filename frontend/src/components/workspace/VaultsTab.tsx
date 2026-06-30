import type { LedgerEntry } from '#/lib/api/workspaces.api'
import { workspacesApi } from '#/lib/api/workspaces.api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
	ArchiveIcon,
	ArrowDownIcon,
	ArrowUpIcon,
	DownloadIcon,
	PlusIcon,
	XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const FADE = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2 } } }

function fmtBalance(value: string | number, currency: string) {
	return `${Number(value).toLocaleString('fr-MG')} ${currency}`
}

function fmtDate(iso: string) {
	return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function VaultsTab({ workspaceId, currency, isAdmin }: { workspaceId: string; currency: string; isAdmin: boolean }) {
	const qc = useQueryClient()
	const [showCreate, setShowCreate] = useState(false)
	const [form, setForm] = useState({ name: '', description: '', currency: '' })
	const [selectedVault, setSelectedVault] = useState<string | null>(null)

	const { data: vaults = [], isLoading } = useQuery({
		queryKey: ['vaults', workspaceId],
		queryFn: () => workspacesApi.listVaults(workspaceId),
	})

	const { data: ledger = [] } = useQuery({
		queryKey: ['ledger', workspaceId, selectedVault],
		queryFn: () =>
			selectedVault
				? workspacesApi.getVaultLedger(workspaceId, selectedVault)
				: workspacesApi.getLedger(workspaceId),
	})

	const createMut = useMutation({
		mutationFn: () =>
			workspacesApi.createVault(workspaceId, {
				name: form.name.trim(),
				description: form.description.trim() || undefined,
				currency: form.currency.trim() || currency,
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['vaults', workspaceId] })
			qc.invalidateQueries({ queryKey: ['workspace-summary', workspaceId] })
			setShowCreate(false)
			setForm({ name: '', description: '', currency: '' })
			toast.success('Coffre créé')
		},
		onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur'),
	})

	const archiveMut = useMutation({
		mutationFn: (vaultId: string) => workspacesApi.archiveVault(workspaceId, vaultId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['vaults', workspaceId] })
			toast.success('Coffre archivé')
		},
		onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur'),
	})

	if (isLoading) return <VaultsSkeleton />

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold text-foreground">Coffres ({vaults.length})</h2>
				<div className="flex gap-2">
					<a
						href={`${workspacesApi.exportLedgerCsv(workspaceId)}`}
						className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
						download
					>
						<DownloadIcon className="size-3.5" />
						Export CSV
					</a>
					{isAdmin && (
						<button
							onClick={() => setShowCreate(true)}
							className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
						>
							<PlusIcon className="size-4" />
							Nouveau coffre
						</button>
					)}
				</div>
			</div>

			{/* Create form */}
			<AnimatePresence>
				{showCreate && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						className="overflow-hidden"
					>
						<div className="rounded-xl border border-border bg-card p-4 space-y-3">
							<div className="flex items-center justify-between">
								<p className="text-sm font-semibold text-foreground">Nouveau coffre</p>
								<button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
									<XIcon className="size-4" />
								</button>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="col-span-2 sm:col-span-1">
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Nom *</label>
									<input
										value={form.name}
										onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
										placeholder="Ex: Capital, Réserve…"
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
								<div className="col-span-2 sm:col-span-1">
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Devise (défaut: {currency})</label>
									<input
										value={form.currency}
										onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
										placeholder={currency}
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
								<div className="col-span-2">
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
									<input
										value={form.description}
										onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
										placeholder="Usage de ce coffre…"
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
							</div>
							<div className="flex justify-end gap-2">
								<button onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
									Annuler
								</button>
								<button
									onClick={() => createMut.mutate()}
									disabled={createMut.isPending || !form.name.trim()}
									className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
								>
									{createMut.isPending && (
										<span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
									)}
									Créer
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Vault grid */}
			{vaults.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
					<p className="font-semibold text-foreground">Aucun coffre</p>
					<p className="text-sm text-muted-foreground">Créez votre premier coffre pour commencer à organiser les finances du groupe.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{vaults.map((vault) => (
						<motion.div
							key={vault.id}
							variants={FADE}
							initial="hidden"
							animate="show"
							onClick={() => setSelectedVault(selectedVault === vault.id ? null : vault.id)}
							className={`cursor-pointer rounded-xl border p-4 transition-all ${
								selectedVault === vault.id
									? 'border-primary bg-primary/5 shadow-sm'
									: 'border-border bg-card hover:border-primary/50'
							}`}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-foreground">{vault.name}</p>
									{vault.description && (
										<p className="mt-0.5 truncate text-xs text-muted-foreground">{vault.description}</p>
									)}
								</div>
								{isAdmin && (
									<button
										onClick={(e) => {
											e.stopPropagation()
											if (!window.confirm(`Archiver le coffre « ${vault.name} » ?`)) return
											archiveMut.mutate(vault.id)
										}}
										className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
										title="Archiver"
									>
										<ArchiveIcon className="size-3.5" />
									</button>
								)}
							</div>
							<p className="mt-3 text-xl font-bold tabular-nums text-foreground">
								{fmtBalance(vault.balance, vault.currency)}
							</p>
						</motion.div>
					))}
				</div>
			)}

			{/* Ledger section */}
			{vaults.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-sm font-semibold text-foreground">
						Grand Livre
						{selectedVault
							? ` — ${vaults.find((v) => v.id === selectedVault)?.name ?? ''}`
							: ' — tous les coffres'}
					</h3>
					<LedgerTable entries={ledger} />
				</div>
			)}
		</div>
	)
}

function LedgerTable({ entries }: { entries: LedgerEntry[] }) {
	if (entries.length === 0) {
		return (
			<div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
				Aucune opération enregistrée
			</div>
		)
	}
	return (
		<div className="overflow-x-auto rounded-xl border border-border">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-border bg-muted/40">
						<th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
						<th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
						<th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catégorie</th>
						<th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Montant</th>
						<th className="hidden px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Description</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{entries.map((e) => (
						<tr key={e.id} className="bg-card hover:bg-muted/30 transition-colors">
							<td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{fmtDate(e.createdAt)}</td>
							<td className="px-4 py-2.5">
								{e.type === 'IN' ? (
									<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
										<ArrowUpIcon className="size-3" />IN
									</span>
								) : (
									<span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
										<ArrowDownIcon className="size-3" />OUT
									</span>
								)}
							</td>
							<td className="px-4 py-2.5 text-xs text-muted-foreground">{e.category}</td>
							<td className={`px-4 py-2.5 text-right text-sm font-bold tabular-nums ${e.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
								{e.type === 'IN' ? '+' : '−'}{Number(e.amount).toLocaleString('fr-MG')} {e.currency}
							</td>
							<td className="hidden max-w-48 truncate px-4 py-2.5 text-xs text-muted-foreground sm:table-cell">
								{e.description ?? '—'}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

function VaultsSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{[0, 1, 2].map((i) => (
				<div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
			))}
		</div>
	)
}
