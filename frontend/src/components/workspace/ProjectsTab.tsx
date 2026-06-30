import type { Project } from '#/lib/api/workspaces.api'
import { workspacesApi } from '#/lib/api/workspaces.api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
	CheckCircle2Icon,
	CircleIcon,
	ClockIcon,
	PlusIcon,
	ThumbsDownIcon,
	ThumbsUpIcon,
	XCircleIcon,
	XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
	PENDING_VOTE: { label: 'Vote en cours', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: ClockIcon },
	APPROVED: { label: 'Approuvé', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2Icon },
	REJECTED: { label: 'Rejeté', color: 'bg-red-500/10 text-red-500', icon: XCircleIcon },
	ACTIVE: { label: 'Actif', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: CheckCircle2Icon },
	COMPLETED: { label: 'Terminé', color: 'bg-muted text-muted-foreground', icon: CheckCircle2Icon },
	CANCELLED: { label: 'Annulé', color: 'bg-muted text-muted-foreground', icon: XCircleIcon },
}

export function ProjectsTab({ workspaceId, currency, isAdmin }: {
	workspaceId: string
	currency: string
	isAdmin: boolean
}) {
	const qc = useQueryClient()
	const [showCreate, setShowCreate] = useState(false)
	const [form, setForm] = useState({
		title: '',
		description: '',
		budget: '',
		sourceVaultId: '',
		voteClosesAt: defaultClosesAt(),
		voteThreshold: '51',
	})

	const { data: projects = [], isLoading } = useQuery({
		queryKey: ['projects', workspaceId],
		queryFn: () => workspacesApi.listProjects(workspaceId),
	})

	const { data: vaults = [] } = useQuery({
		queryKey: ['vaults', workspaceId],
		queryFn: () => workspacesApi.listVaults(workspaceId),
	})

	const createMut = useMutation({
		mutationFn: () =>
			workspacesApi.createProject(workspaceId, {
				title: form.title.trim(),
				description: form.description.trim(),
				budget: form.budget ? Number(form.budget) : undefined,
				currency,
				sourceVaultId: form.sourceVaultId || undefined,
				voteClosesAt: new Date(form.voteClosesAt).toISOString(),
				voteThreshold: Number(form.voteThreshold),
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['projects', workspaceId] })
			setShowCreate(false)
			resetForm()
			toast.success('Projet créé et vote ouvert')
		},
		onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur'),
	})

	function resetForm() {
		setForm({ title: '', description: '', budget: '', sourceVaultId: '', voteClosesAt: defaultClosesAt(), voteThreshold: '51' })
	}

	if (isLoading) return <ProjectsSkeleton />

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold text-foreground">Projets ({projects.length})</h2>
				<button
					onClick={() => setShowCreate(true)}
					className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
				>
					<PlusIcon className="size-4" />
					Proposer
				</button>
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
								<p className="text-sm font-semibold text-foreground">Nouveau projet</p>
								<button onClick={() => { setShowCreate(false); resetForm() }} className="text-muted-foreground hover:text-foreground cursor-pointer">
									<XIcon className="size-4" />
								</button>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="col-span-2">
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Titre *</label>
									<input
										value={form.title}
										onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
										placeholder="Ex: Achat matériel…"
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
								<div className="col-span-2">
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Description *</label>
									<textarea
										rows={3}
										value={form.description}
										onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
										placeholder="Décrivez l'objectif et la justification du projet…"
										className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Budget ({currency})</label>
									<input
										type="number"
										min="0"
										value={form.budget}
										onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
										placeholder="0"
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Coffre source</label>
									<select
										value={form.sourceVaultId}
										onChange={(e) => setForm((p) => ({ ...p, sourceVaultId: e.target.value }))}
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm cursor-pointer"
									>
										<option value="">— Aucun —</option>
										{vaults.map((v) => (
											<option key={v.id} value={v.id}>{v.name}</option>
										))}
									</select>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Vote clôture *</label>
									<input
										type="datetime-local"
										value={form.voteClosesAt}
										onChange={(e) => setForm((p) => ({ ...p, voteClosesAt: e.target.value }))}
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-medium text-muted-foreground">Seuil approbation (%)</label>
									<input
										type="number"
										min="1"
										max="100"
										value={form.voteThreshold}
										onChange={(e) => setForm((p) => ({ ...p, voteThreshold: e.target.value }))}
										className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
								</div>
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
									disabled={createMut.isPending || !form.title.trim() || !form.description.trim()}
									className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
								>
									{createMut.isPending && (
										<span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
									)}
									Soumettre
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Projects list */}
			{projects.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
					<p className="font-semibold text-foreground">Aucun projet</p>
					<p className="text-sm text-muted-foreground">Proposez le premier projet du groupe pour lancer un vote collectif.</p>
				</div>
			) : (
				<div className="space-y-3">
					{projects.map((project) => (
						<ProjectCard
							key={project.id}
							project={project}
							workspaceId={workspaceId}
							isAdmin={isAdmin}
						/>
					))}
				</div>
			)}
		</div>
	)
}

function ProjectCard({ project, workspaceId, isAdmin }: {
	project: Project
	workspaceId: string
	isAdmin: boolean
}) {
	const qc = useQueryClient()
	const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.PENDING_VOTE
	const StatusIcon = cfg.icon
	const [expanded, setExpanded] = useState(false)

	const { data: myVote } = useQuery({
		queryKey: ['my-vote', workspaceId, project.vote?.id],
		queryFn: () => workspacesApi.getMyVote(workspaceId, project.vote!.id),
		enabled: !!project.vote?.id && project.vote.status === 'OPEN',
	})

	const castMut = useMutation({
		mutationFn: (choice: 'YES' | 'NO' | 'ABSTAIN') =>
			workspacesApi.castVote(workspaceId, project.vote!.id, choice),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['projects', workspaceId] })
			qc.invalidateQueries({ queryKey: ['my-vote', workspaceId, project.vote?.id] })
			toast.success('Vote enregistré')
		},
		onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur'),
	})

	const closeMut = useMutation({
		mutationFn: () => workspacesApi.closeVote(workspaceId, project.vote!.id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['projects', workspaceId] })
			toast.success('Vote clôturé')
		},
		onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erreur'),
	})

	const vote = project.vote
	const totalVotes = vote ? vote.yesCount + vote.noCount + vote.abstainCount : 0
	const yesPercent = totalVotes > 0 ? (vote!.yesCount / totalVotes) * 100 : 0
	const noPercent = totalVotes > 0 ? (vote!.noCount / totalVotes) * 100 : 0

	const proposerName = project.proposedBy
		? [project.proposedBy.user.firstName, project.proposedBy.user.lastName].filter(Boolean).join(' ') || 'Membre'
		: 'Membre'

	return (
		<motion.div
			layout
			className="rounded-xl border border-border bg-card overflow-hidden"
		>
			<div
				className="flex cursor-pointer items-start gap-3 p-4"
				onClick={() => setExpanded((p) => !p)}
			>
				<div className="mt-0.5 shrink-0">
					<StatusIcon className={`size-4 ${cfg.color.split(' ').find((c) => c.startsWith('text-'))}`} />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-2">
						<p className="text-sm font-semibold text-foreground leading-snug">{project.title}</p>
						<span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
							{cfg.label}
						</span>
					</div>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Proposé par {proposerName}
						{project.budget ? ` · Budget: ${Number(project.budget).toLocaleString('fr-MG')} ${project.currency}` : ''}
					</p>
					{vote && (
						<div className="mt-2 flex items-center gap-3">
							<VoteBar yesPercent={yesPercent} noPercent={noPercent} />
							<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
								{totalVotes} vote{totalVotes !== 1 ? 's' : ''}
							</span>
						</div>
					)}
				</div>
			</div>

			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						className="overflow-hidden border-t border-border"
					>
						<div className="p-4 space-y-4">
							<p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>

							{vote && vote.status === 'OPEN' && (
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<p className="text-xs font-medium text-muted-foreground">
											Clôture : {new Date(vote.closesAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
											{' · '}Seuil : {vote.threshold}%
										</p>
										{isAdmin && (
											<button
												onClick={() => closeMut.mutate()}
												disabled={closeMut.isPending}
												className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border hover:bg-muted cursor-pointer disabled:opacity-50"
											>
												Clôturer
											</button>
										)}
									</div>

									{myVote ? (
										<div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
											<CircleIcon className="size-3.5 text-primary" />
											<p className="text-xs text-foreground">
												Vous avez voté :{' '}
												<span className="font-semibold">
													{myVote.choice === 'YES' ? 'Pour' : myVote.choice === 'NO' ? 'Contre' : 'Abstention'}
												</span>
											</p>
										</div>
									) : (
										<div className="flex gap-2">
											<VoteButton
												label="Pour"
												icon={<ThumbsUpIcon className="size-3.5" />}
												color="text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20"
												onClick={() => castMut.mutate('YES')}
												disabled={castMut.isPending}
											/>
											<VoteButton
												label="Contre"
												icon={<ThumbsDownIcon className="size-3.5" />}
												color="text-red-500 bg-red-500/10 hover:bg-red-500/20"
												onClick={() => castMut.mutate('NO')}
												disabled={castMut.isPending}
											/>
											<VoteButton
												label="Abstention"
												icon={<CircleIcon className="size-3.5" />}
												color="text-muted-foreground bg-muted hover:bg-muted/80"
												onClick={() => castMut.mutate('ABSTAIN')}
												disabled={castMut.isPending}
											/>
										</div>
									)}
								</div>
							)}

							{vote && vote.status === 'CLOSED' && vote.result && (
								<div className={`rounded-lg px-3 py-2 ${vote.result === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
									<p className="text-sm font-semibold">
										{vote.result === 'APPROVED' ? 'Vote approuvé' : vote.result === 'REJECTED' ? 'Vote rejeté' : 'Quorum non atteint'}
										{' — '}{vote.yesCount} pour, {vote.noCount} contre, {vote.abstainCount} abstentions
									</p>
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	)
}

function VoteBar({ yesPercent, noPercent }: { yesPercent: number; noPercent: number }) {
	return (
		<div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
			<div className="bg-emerald-500 transition-all" style={{ width: `${yesPercent}%` }} />
			<div className="bg-red-500 transition-all" style={{ width: `${noPercent}%` }} />
		</div>
	)
}

function VoteButton({ label, icon, color, onClick, disabled }: {
	label: string
	icon: React.ReactNode
	color: string
	onClick: () => void
	disabled: boolean
}) {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${color}`}
		>
			{icon}
			{label}
		</button>
	)
}

function defaultClosesAt() {
	const d = new Date()
	d.setDate(d.getDate() + 7)
	d.setMinutes(0, 0, 0)
	return d.toISOString().slice(0, 16)
}

function ProjectsSkeleton() {
	return (
		<div className="space-y-3">
			{[0, 1, 2].map((i) => (
				<div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
			))}
		</div>
	)
}
