import type { FluxRule, Vault } from '#/lib/api/workspaces.api'
import { workspacesApi } from '#/lib/api/workspaces.api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDownIcon, PlusIcon, PlayIcon, ToggleLeftIcon, ToggleRightIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type DestForm = { targetType: 'GROUP_VAULT' | 'WITHDRAWABLE_VAULTS'; targetVaultId: string; percent: string }

const emptyDest = (): DestForm => ({ targetType: 'GROUP_VAULT', targetVaultId: '', percent: '' })

export function FluxTab({ workspaceId, isAdmin }: { workspaceId: string; isAdmin: boolean }) {
	const qc = useQueryClient()
	const [showCreate, setShowCreate] = useState(false)
	const [applyingId, setApplyingId] = useState<string | null>(null)
	const [applyAmount, setApplyAmount] = useState('')
	const [applyDesc, setApplyDesc] = useState('')

	const [form, setForm] = useState({
		name: '',
		description: '',
		sourceType: 'MANUAL' as 'COTISATION' | 'PROJECT_REVENUE' | 'MANUAL',
		destinations: [emptyDest()],
	})

	const { data: rules = [], isLoading } = useQuery({
		queryKey: ['flux-rules', workspaceId],
		queryFn: () => workspacesApi.listFluxRules(workspaceId),
	})

	const { data: vaults = [] } = useQuery({
		queryKey: ['vaults', workspaceId],
		queryFn: () => workspacesApi.listVaults(workspaceId),
	})

	const createMut = useMutation({
		mutationFn: () =>
			workspacesApi.createFluxRule(workspaceId, {
				name: form.name.trim(),
				description: form.description.trim() || undefined,
				sourceType: form.sourceType,
				destinations: form.destinations
					.filter((d) => d.percent)
					.map((d) => ({
						targetType: d.targetType,
						targetVaultId: d.targetVaultId || undefined,
						percent: Number(d.percent),
					})),
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['flux-rules', workspaceId] })
			setShowCreate(false)
			resetForm()
			toast.success('Règle Flux créée')
		},
		onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur'),
	})

	const toggleMut = useMutation({
		mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
			workspacesApi.updateFluxRule(workspaceId, id, { isActive: !isActive }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['flux-rules', workspaceId] }),
		onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur'),
	})

	const applyMut = useMutation({
		mutationFn: ({ id, amount }: { id: string; amount: number }) =>
			workspacesApi.applyFluxRule(workspaceId, id, { amount, description: applyDesc || undefined }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['vaults', workspaceId] })
			qc.invalidateQueries({ queryKey: ['ledger', workspaceId] })
			qc.invalidateQueries({ queryKey: ['workspace-summary', workspaceId] })
			setApplyingId(null)
			setApplyAmount('')
			setApplyDesc('')
			toast.success('Flux appliqué')
		},
		onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur'),
	})

	function resetForm() {
		setForm({ name: '', description: '', sourceType: 'MANUAL', destinations: [emptyDest()] })
	}

	function addDest() {
		setForm((p) => ({ ...p, destinations: [...p.destinations, emptyDest()] }))
	}

	function removeDest(i: number) {
		setForm((p) => ({ ...p, destinations: p.destinations.filter((_, idx) => idx !== i) }))
	}

	function updateDest(i: number, patch: Partial<DestForm>) {
		setForm((p) => ({
			...p,
			destinations: p.destinations.map((d, idx) => (idx === i ? { ...d, ...patch } : d)),
		}))
	}

	const totalPercent = form.destinations.reduce((s, d) => s + Number(d.percent || 0), 0)
	const percentOk = Math.abs(totalPercent - 100) < 0.01

	if (isLoading) return <FluxSkeleton />

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold text-foreground">Règles Flux ({rules.length})</h2>
				{isAdmin && (
					<button
						onClick={() => setShowCreate(true)}
						className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
					>
						<PlusIcon className="size-4" />
						Nouvelle règle
					</button>
				)}
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
						<div className="rounded-xl border border-border bg-card p-4 space-y-4">
							<div className="flex items-center justify-between">
								<p className="text-sm font-semibold text-foreground">Nouvelle règle</p>
								<button onClick={() => { setShowCreate(false); resetForm() }} className="text-muted-foreground hover:text-foreground cursor-pointer">
									<XIcon className="size-4" />
								</button>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="col-span-2 sm:col-span-1">
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Nom *</label>
									<input
										value={form.name}
										onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
										placeholder="Ex: Répartition cotisations…"
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
								<div className="col-span-2 sm:col-span-1">
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Source</label>
									<select
										value={form.sourceType}
										onChange={(e) => setForm((p) => ({ ...p, sourceType: e.target.value as any }))}
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none cursor-pointer"
									>
										<option value="MANUAL">Manuelle</option>
										<option value="COTISATION">Cotisations</option>
										<option value="PROJECT_REVENUE">Revenu projet</option>
									</select>
								</div>
								<div className="col-span-2">
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
									<input
										value={form.description}
										onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
										placeholder="Description optionnelle…"
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
							</div>

							{/* Destinations */}
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<label className="text-xs font-medium text-muted-foreground">
										Destinations{' '}
										<span className={`font-semibold ${percentOk ? 'text-emerald-600' : 'text-amber-500'}`}>
											({totalPercent.toFixed(0)}% / 100%)
										</span>
									</label>
									<button
										onClick={addDest}
										className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 cursor-pointer"
									>
										<PlusIcon className="size-3" />
										Ajouter
									</button>
								</div>
								{form.destinations.map((d, i) => (
									<div key={i} className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
										<select
											value={d.targetType}
											onChange={(e) => updateDest(i, { targetType: e.target.value as any, targetVaultId: '' })}
											className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs cursor-pointer"
										>
											<option value="GROUP_VAULT">Coffre groupe</option>
											<option value="WITHDRAWABLE_VAULTS">Retraits membres</option>
										</select>
										{d.targetType === 'GROUP_VAULT' && (
											<select
												value={d.targetVaultId}
												onChange={(e) => updateDest(i, { targetVaultId: e.target.value })}
												className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs cursor-pointer"
											>
												<option value="">— Coffre —</option>
												{vaults.map((v) => (
													<option key={v.id} value={v.id}>{v.name}</option>
												))}
											</select>
										)}
										<input
											type="number"
											min="0"
											max="100"
											placeholder="%"
											value={d.percent}
											onChange={(e) => updateDest(i, { percent: e.target.value })}
											className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-xs text-right"
										/>
										<span className="text-xs text-muted-foreground">%</span>
										{form.destinations.length > 1 && (
											<button onClick={() => removeDest(i)} className="text-destructive/60 hover:text-destructive cursor-pointer">
												<XIcon className="size-3.5" />
											</button>
										)}
									</div>
								))}
							</div>

							<div className="flex justify-end gap-2">
								<button
									onClick={() => { setShowCreate(false); resetForm() }}
									className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
								>
									Annuler
								</button>
								<button
									onClick={() => createMut.mutate()}
									disabled={createMut.isPending || !form.name.trim() || !percentOk}
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

			{/* Rules list */}
			{rules.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
					<p className="font-semibold text-foreground">Aucune règle Flux</p>
					<p className="text-sm text-muted-foreground">Les règles Flux définissent comment redistribuer les fonds entre les coffres.</p>
				</div>
			) : (
				<div className="space-y-3">
					{rules.map((rule) => (
						<FluxRuleCard
							key={rule.id}
							rule={rule}
							vaults={vaults}
							isAdmin={isAdmin}
							onToggle={() => toggleMut.mutate({ id: rule.id, isActive: rule.isActive })}
							onApply={() => { setApplyingId(rule.id); setApplyAmount(''); setApplyDesc('') }}
						/>
					))}
				</div>
			)}

			{/* Apply modal */}
			<AnimatePresence>
				{applyingId && (
					<>
						<motion.div
							key="backdrop"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
							onClick={() => setApplyingId(null)}
						/>
						<motion.div
							key="modal"
							initial={{ opacity: 0, scale: 0.96, y: 8 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.96, y: 8 }}
							transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
							className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-2xl"
						>
							<div className="flex items-center justify-between mb-4">
								<h3 className="font-semibold text-foreground">Appliquer la règle</h3>
								<button onClick={() => setApplyingId(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
									<XIcon className="size-4" />
								</button>
							</div>
							<div className="space-y-3">
								<div>
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Montant *</label>
									<input
										type="number"
										min="1"
										value={applyAmount}
										onChange={(e) => setApplyAmount(e.target.value)}
										placeholder="0"
										autoFocus
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
									<input
										value={applyDesc}
										onChange={(e) => setApplyDesc(e.target.value)}
										placeholder="Optionnel…"
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
							</div>
							<div className="mt-4 flex gap-2">
								<button onClick={() => setApplyingId(null)} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">
									Annuler
								</button>
								<button
									onClick={() => {
										const amount = Number(applyAmount)
										if (!amount || amount <= 0) return toast.error('Montant invalide')
										applyMut.mutate({ id: applyingId!, amount })
									}}
									disabled={applyMut.isPending || !applyAmount}
									className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
								>
									{applyMut.isPending ? (
										<span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
									) : (
										<PlayIcon className="size-4" />
									)}
									Appliquer
								</button>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	)
}

function FluxRuleCard({ rule, vaults, isAdmin, onToggle, onApply }: {
	rule: FluxRule
	vaults: Vault[]
	isAdmin: boolean
	onToggle: () => void
	onApply: () => void
}) {
	const [expanded, setExpanded] = useState(false)

	return (
		<div className="rounded-xl border border-border bg-card">
			<div className="flex items-center gap-3 p-4">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<p className="text-sm font-semibold text-foreground">{rule.name}</p>
						<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
							rule.isActive
								? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
								: 'bg-muted text-muted-foreground'
						}`}>
							{rule.isActive ? 'Active' : 'Inactive'}
						</span>
						<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
							{rule.sourceType}
						</span>
					</div>
					{rule.description && (
						<p className="mt-0.5 text-xs text-muted-foreground">{rule.description}</p>
					)}
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					{isAdmin && rule.isActive && (
						<button
							onClick={onApply}
							className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer"
						>
							<PlayIcon className="size-3" />
							Appliquer
						</button>
					)}
					{isAdmin && (
						<button onClick={onToggle} className="text-muted-foreground hover:text-foreground cursor-pointer" title={rule.isActive ? 'Désactiver' : 'Activer'}>
							{rule.isActive
								? <ToggleRightIcon className="size-5 text-emerald-500" />
								: <ToggleLeftIcon className="size-5" />}
						</button>
					)}
					<button
						onClick={() => setExpanded((p) => !p)}
						className="text-muted-foreground hover:text-foreground cursor-pointer"
					>
						<ChevronDownIcon className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
					</button>
				</div>
			</div>

			<AnimatePresence>
				{expanded && rule.destinations.length > 0 && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						className="overflow-hidden border-t border-border"
					>
						<div className="p-4 space-y-1.5">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Destinations</p>
							{rule.destinations.map((d) => {
								const vaultName = d.targetVaultId
									? (vaults.find((v) => v.id === d.targetVaultId)?.name ?? d.targetVault?.name ?? d.targetVaultId)
									: null
								return (
									<div key={d.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
										<span className="text-xs text-foreground">
											{d.targetType === 'WITHDRAWABLE_VAULTS'
												? 'Retraits membres'
												: vaultName ?? 'Coffre'}
										</span>
										<span className="text-sm font-bold tabular-nums text-primary">{d.percent}%</span>
									</div>
								)
							})}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

function FluxSkeleton() {
	return (
		<div className="space-y-3">
			{[0, 1].map((i) => (
				<div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
			))}
		</div>
	)
}
