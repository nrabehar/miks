import {
	type CotisationEntry,
	type EquityItem,
	type WorkspaceMember,
	workspacesApi,
} from '#/lib/api/workspaces.api'
import { AuditTab } from '#/components/workspace/AuditTab'
import { FluxTab } from '#/components/workspace/FluxTab'
import { ProjectsTab } from '#/components/workspace/ProjectsTab'
import { VaultsTab } from '#/components/workspace/VaultsTab'
import { useAuthStore } from '#/stores/auth.store'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
	ArrowLeftIcon,
	CheckIcon,
	ChevronUpIcon,
	CrownIcon,
	EyeIcon,
	FolderOpenIcon,
	MailIcon,
	MinusCircleIcon,
	PlusIcon,
	ScrollTextIcon,
	ShieldIcon,
	TrendingUpIcon,
	UserIcon,
	UsersIcon,
	WalletIcon,
	XIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authed/workspace/$id')({
	staticData: { title: 'Workspace' },
	component: WorkspacePage,
})

const FADE_UP = {
	hidden: { opacity: 0, y: 12 },
	show: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { duration: 0.28, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
	}),
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
	admin: { label: 'Admin', icon: CrownIcon, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
	member: { label: 'Membre', icon: UserIcon, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
	observer: { label: 'Observateur', icon: EyeIcon, color: 'text-muted-foreground bg-muted/60' },
}

function WorkspacePage() {
	const { id } = Route.useParams()
	const user = useAuthStore((s) => s.user)
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	const [tab, setTab] = useState<'overview' | 'vaults' | 'projects' | 'members' | 'journal'>('overview')
	const [showInvite, setShowInvite] = useState(false)
	const [inviteEmail, setInviteEmail] = useState('')
	const [inviteRole, setInviteRole] = useState<'member' | 'observer'>('member')
	const inviteInputRef = useRef<HTMLInputElement>(null)

	const { data: workspace, isLoading, isError } = useQuery({
		queryKey: ['workspace', id],
		queryFn: () => workspacesApi.get(id),
	})

	const { data: summary } = useQuery({
		queryKey: ['workspace-summary', id],
		queryFn: () => workspacesApi.getSummary(id),
		retry: false,
	})

	const { data: equity = [] } = useQuery({
		queryKey: ['workspace-equity', id],
		queryFn: () => workspacesApi.getEquity(id),
		retry: false,
	})

	const inviteMutation = useMutation({
		mutationFn: () => workspacesApi.invite(id, inviteEmail.trim(), inviteRole),
		onSuccess: () => {
			setInviteEmail('')
			setShowInvite(false)
			queryClient.invalidateQueries({ queryKey: ['workspace', id] })
			toast.success('Invitation envoyée')
		},
		onError: (err: any) => {
			const msg = err.response?.data?.message ?? 'Une erreur est survenue'
			toast.error(Array.isArray(msg) ? msg.join(' · ') : msg)
		},
	})

	const removeMemberMutation = useMutation({
		mutationFn: (userId: string) => workspacesApi.removeMember(id, userId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspace', id] })
			toast.success('Membre retiré')
		},
		onError: () => toast.error('Impossible de retirer ce membre'),
	})

	const deleteWorkspaceMutation = useMutation({
		mutationFn: () => workspacesApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
			navigate({ to: '/dashboard' })
			toast.success('Workspace supprimé')
		},
		onError: () => toast.error('Impossible de supprimer ce workspace'),
	})

	if (isLoading) return <WorkspaceSkeleton />
	if (isError || !workspace) {
		return (
			<div className="mx-auto max-w-5xl px-4 py-16 text-center">
				<p className="font-semibold text-foreground">Workspace introuvable</p>
				<p className="mt-1 text-sm text-muted-foreground">Vous n'êtes pas membre de ce workspace.</p>
				<Link to="/dashboard" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
					<ArrowLeftIcon className="size-3.5" /> Retour au dashboard
				</Link>
			</div>
		)
	}

	const currentMember = workspace.workspaceMembers.find((m) => m.userId === user?.id)
	const isAdmin = currentMember?.role === 'admin'
	const currency = workspace.currency ?? 'MGA'

	const handleOpenInvite = () => {
		setShowInvite(true)
		setTimeout(() => inviteInputRef.current?.focus(), 80)
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">

			{/* Breadcrumb */}
			<motion.div custom={0} variants={FADE_UP} initial="hidden" animate="show">
				<Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
					<ArrowLeftIcon className="size-3.5" />
					Dashboard
				</Link>
			</motion.div>

			{/* Header */}
			<motion.div custom={1} variants={FADE_UP} initial="hidden" animate="show">
				<div className="flex items-start justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary">
							{workspace.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
						</div>
						<div>
							<h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
								{workspace.name}
							</h1>
							<div className="mt-0.5 flex items-center gap-2">
								<span className="text-xs text-muted-foreground">/{workspace.slug}</span>
								{currentMember && (
									<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_CONFIG[currentMember.role]?.color ?? ''}`}>
										{ROLE_CONFIG[currentMember.role]?.label}
									</span>
								)}
							</div>
						</div>
					</div>
					{isAdmin && (
						<button
							onClick={() => {
								if (!window.confirm(`Supprimer définitivement « ${workspace.name} » ?`)) return
								deleteWorkspaceMutation.mutate()
							}}
							disabled={deleteWorkspaceMutation.isPending}
							className="hidden sm:flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/8 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
						>
							Supprimer
						</button>
					)}
				</div>
			</motion.div>

			{/* Vault KPI cards */}
			<motion.div custom={2} variants={FADE_UP} initial="hidden" animate="show">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<VaultCard
						label="Total caisse"
						value={summary ? fmt(summary.totalCaisse ?? 0, currency) : null}
						icon={<TrendingUpIcon className="size-4" />}
						colorClass="text-primary bg-primary/10"
						description="Toutes cotisations cumulées"
					/>
					<VaultCard
						label="C1 — Liquidité"
						value={summary ? fmt(summary.c1Balance ?? 0, currency) : null}
						icon={<ShieldIcon className="size-4" />}
						colorClass="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
						description="Disponible"
					/>
					<VaultCard
						label="C2 — Investissement"
						value={summary ? fmt(summary.c2Balance ?? 0, currency) : null}
						icon={<TrendingUpIcon className="size-4" />}
						colorClass="text-blue-600 dark:text-blue-400 bg-blue-500/10"
						description="Bloqué"
					/>
					<VaultCard
						label="Taux cotisation"
						value={summary ? `${Math.round(summary.cotisationRateThisMonth ?? 0)}%` : null}
						icon={<UsersIcon className="size-4" />}
						colorClass={
							summary && (summary.cotisationRateThisMonth ?? 0) >= 70
								? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
								: 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
						}
						description="Ce mois"
						isText
					/>
				</div>
			</motion.div>

			{/* Tab navigation */}
			<motion.div custom={3} variants={FADE_UP} initial="hidden" animate="show">
				<div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1 overflow-x-auto">
					{([
						{ key: 'overview', label: 'Ensemble', icon: TrendingUpIcon },
						{ key: 'vaults', label: 'Coffres', icon: WalletIcon },
						{ key: 'projects', label: 'Projets', icon: FolderOpenIcon },
						{ key: 'members', label: 'Membres', icon: UsersIcon },
						{ key: 'journal', label: 'Journal', icon: ScrollTextIcon },
					] as const).map((t) => (
						<button
							key={t.key}
							onClick={() => setTab(t.key)}
							className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
								tab === t.key
									? 'bg-card text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							<t.icon className="size-3.5" />
							<span className="hidden sm:inline">{t.label}</span>
						</button>
					))}
				</div>
			</motion.div>

			{/* Tab content */}
			<AnimatePresence mode="wait">
				{tab === 'overview' && (
					<motion.div
						key="overview"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2 }}
						className="space-y-6"
					>
						{/* Equity ranking */}
						<section aria-labelledby="equity-heading" className="space-y-3">
							<div className="flex items-center justify-between">
								<h2 id="equity-heading" className="text-base font-semibold text-foreground">
									Equity — Parts sociales
								</h2>
								{isAdmin && (
									<CotisationBatchButton workspaceId={id} members={workspace.workspaceMembers} currency={currency} />
								)}
							</div>
							{equity.length === 0 ? (
								<EquityEmptyState isAdmin={isAdmin} />
							) : (
								<div className="overflow-hidden rounded-xl border border-border bg-card">
									{equity.map((item, i) => (
										<EquityRow key={item.memberId} item={item} index={i} currency={currency} total={equity.length} />
									))}
								</div>
							)}
						</section>
					</motion.div>
				)}

				{tab === 'members' && (
					<motion.div
						key="members"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2 }}
						className="space-y-4"
					>
						<div className="flex items-center justify-between">
							<h2 className="text-base font-semibold text-foreground">
								Membres ({workspace.workspaceMembers.length})
							</h2>
							{isAdmin && (
								<button
									onClick={handleOpenInvite}
									className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
								>
									<PlusIcon className="size-4" />
									Inviter
								</button>
							)}
						</div>

						{/* Invite form */}
						<AnimatePresence>
							{showInvite && (
								<motion.div
									key="invite-form"
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
									className="overflow-hidden"
								>
									<div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
										<label htmlFor="invite-email" className="sr-only">Email</label>
										<input
											id="invite-email"
											ref={inviteInputRef}
											type="email"
											value={inviteEmail}
											onChange={(e) => setInviteEmail(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') inviteMutation.mutate()
												if (e.key === 'Escape') setShowInvite(false)
											}}
											placeholder="email@exemple.com"
											className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-shadow"
										/>
										<select
											value={inviteRole}
											onChange={(e) => setInviteRole(e.target.value as 'member' | 'observer')}
											className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
										>
											<option value="member">Membre</option>
											<option value="observer">Observateur</option>
										</select>
										<button
											onClick={() => inviteMutation.mutate()}
											disabled={inviteMutation.isPending || !inviteEmail.trim().includes('@')}
											className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 cursor-pointer"
										>
											{inviteMutation.isPending
												? <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
												: <MailIcon className="size-4" />}
											Inviter
										</button>
										<button onClick={() => { setShowInvite(false); setInviteEmail('') }}
											className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted cursor-pointer">
											<XIcon className="size-4" />
										</button>
									</div>
								</motion.div>
							)}
						</AnimatePresence>

						<div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
							{workspace.workspaceMembers.map((member, i) => (
								<MemberRow
									key={member.id}
									member={member}
									index={i}
									isCurrentUser={member.userId === user?.id}
									isAdmin={isAdmin}
									onRemove={() => removeMemberMutation.mutate(member.userId)}
									removing={removeMemberMutation.isPending}
								/>
							))}
						</div>
					</motion.div>
				)}

				{tab === 'vaults' && (
					<motion.div
						key="vaults"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2 }}
						className="space-y-8"
					>
						<VaultsTab workspaceId={id} currency={currency} isAdmin={isAdmin} />
						<div className="border-t border-border pt-6">
							<FluxTab workspaceId={id} isAdmin={isAdmin} />
						</div>
					</motion.div>
				)}

				{tab === 'projects' && (
					<motion.div
						key="projects"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2 }}
					>
						<ProjectsTab
							workspaceId={id}
							currency={currency}
							isAdmin={isAdmin}
						/>
					</motion.div>
				)}

				{tab === 'journal' && (
					<motion.div
						key="journal"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2 }}
					>
						<AuditTab workspaceId={id} />
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

// ─── Vault KPI Card ───────────────────────────────────────────────────────────

function VaultCard({ label, value, icon, colorClass, description, isText }: {
	label: string
	value: string | null
	icon: React.ReactNode
	colorClass: string
	description: string
	isText?: boolean
}) {
	return (
		<div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
					{label}
				</p>
				<div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
					{icon}
				</div>
			</div>
			{value === null ? (
				<div className="h-6 w-20 animate-pulse rounded bg-muted" />
			) : (
				<p className={`font-bold tabular-nums text-foreground ${isText ? 'text-lg' : 'text-xl'}`}>{value}</p>
			)}
			<p className="text-[10px] text-muted-foreground">{description}</p>
		</div>
	)
}

// ─── Equity Row ───────────────────────────────────────────────────────────────

function EquityRow({ item, index, currency, total }: {
	item: EquityItem
	index: number
	currency: string
	total: number
}) {
	const isTop = index === 0
	return (
		<div className={`flex items-center gap-3 px-4 py-3 ${index < total - 1 ? 'border-b border-border/60' : ''}`}>
			<div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
				isTop ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
			}`}>
				{item.rank}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-2 mb-1">
					<p className="truncate text-sm font-semibold text-foreground">{item.displayName}</p>
					<p className="shrink-0 text-xs font-bold text-foreground tabular-nums">
						{fmt(item.withdrawableBalance, currency)}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
						<div
							className={`h-full rounded-full ${isTop ? 'bg-primary' : 'bg-primary/50'}`}
							style={{ width: `${Math.max(2, item.sharePercent)}%` }}
						/>
					</div>
					<span className="shrink-0 text-[11px] font-semibold text-muted-foreground tabular-nums">
						{item.sharePercent.toFixed(1)}%
					</span>
				</div>
			</div>
			{isTop && (
				<ChevronUpIcon className="size-3.5 shrink-0 text-primary" />
			)}
		</div>
	)
}

// ─── Equity Empty State ───────────────────────────────────────────────────────

function EquityEmptyState({ isAdmin }: { isAdmin: boolean }) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
				<TrendingUpIcon className="size-6 text-primary" />
			</div>
			<div>
				<p className="font-semibold text-foreground">Aucune cotisation enregistrée</p>
				<p className="mt-1 text-sm text-muted-foreground max-w-sm">
					{isAdmin
						? 'Enregistrez les premières cotisations pour activer l\'Equity Engine et voir les parts de chaque membre.'
						: 'L\'administrateur n\'a pas encore enregistré de cotisations pour ce groupe.'}
				</p>
			</div>
		</div>
	)
}

// ─── Cotisation Batch Button + Modal ─────────────────────────────────────────

function CotisationBatchButton({
	workspaceId,
	members,
	currency,
}: {
	workspaceId: string
	members: WorkspaceMember[]
	currency: string
}) {
	const queryClient = useQueryClient()
	const [open, setOpen] = useState(false)
	const now = new Date()
	const [month, setMonth] = useState(now.getMonth() + 1)
	const [year, setYear] = useState(now.getFullYear())
	const [amounts, setAmounts] = useState<Record<string, string>>({})

	const mutation = useMutation({
		mutationFn: (entries: CotisationEntry[]) => workspacesApi.recordBatch(workspaceId, entries),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workspace-equity', workspaceId] })
			queryClient.invalidateQueries({ queryKey: ['workspace-summary', workspaceId] })
			setOpen(false)
			setAmounts({})
			toast.success('Cotisations enregistrées')
		},
		onError: (err: any) => {
			const msg = err.response?.data?.message ?? 'Erreur'
			toast.error(Array.isArray(msg) ? msg.join(' · ') : msg)
		},
	})

	const eligibleMembers = members.filter((m) => m.role !== 'observer')

	const handleSubmit = () => {
		const entries: CotisationEntry[] = eligibleMembers
			.filter((m) => amounts[m.id] && Number(amounts[m.id]) > 0)
			.map((m) => ({
				memberId: m.id,
				amount: Number(amounts[m.id]),
				month,
				year,
			}))
		if (entries.length === 0) {
			toast.error('Saisissez au moins un montant')
			return
		}
		mutation.mutate(entries)
	}

	const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

	return (
		<>
			<button
				onClick={() => setOpen(true)}
				className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
			>
				<PlusIcon className="size-4" />
				Saisir cotisations
			</button>

			<AnimatePresence>
				{open && (
					<>
						<motion.div
							key="backdrop"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.18 }}
							className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
							onClick={() => setOpen(false)}
						/>
						<motion.div
							key="modal"
							initial={{ opacity: 0, scale: 0.96, y: 8 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.96, y: 8 }}
							transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
							className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl"
						>
							<div className="flex items-center justify-between border-b border-border px-5 py-4">
								<h3 className="font-semibold text-foreground">Saisie des cotisations</h3>
								<button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted cursor-pointer">
									<XIcon className="size-4" />
								</button>
							</div>

							{/* Period selector */}
							<div className="flex gap-2 border-b border-border/60 px-5 py-3">
								<select
									value={month}
									onChange={(e) => setMonth(Number(e.target.value))}
									className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
								>
									{MONTHS.map((m, i) => (
										<option key={i} value={i + 1}>{m}</option>
									))}
								</select>
								<select
									value={year}
									onChange={(e) => setYear(Number(e.target.value))}
									className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
								>
									{[2024, 2025, 2026, 2027].map((y) => (
										<option key={y} value={y}>{y}</option>
									))}
								</select>
							</div>

							{/* Member amount inputs */}
							<div className="max-h-72 overflow-y-auto">
								{eligibleMembers.map((m) => {
									const name = [m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || m.user.email
									const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
									return (
										<div key={m.id} className="flex items-center gap-3 border-b border-border/40 px-5 py-3 last:border-0">
											<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
												{initials}
											</div>
											<p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{name}</p>
											<div className="flex items-center gap-1.5">
												<input
													type="number"
													min="0"
													placeholder="0"
													value={amounts[m.id] ?? ''}
													onChange={(e) => setAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))}
													className="w-28 rounded-lg border border-input bg-background px-2 py-1.5 text-right text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
												/>
												<span className="shrink-0 text-xs text-muted-foreground">{currency}</span>
											</div>
										</div>
									)
								})}
							</div>

							<div className="flex gap-2 border-t border-border px-5 py-4">
								<button
									onClick={() => setOpen(false)}
									className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
								>
									Annuler
								</button>
								<button
									onClick={handleSubmit}
									disabled={mutation.isPending}
									className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
								>
									{mutation.isPending ? (
										<span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
									) : (
										<CheckIcon className="size-4" />
									)}
									Enregistrer
								</button>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	)
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
	member, index, isCurrentUser, isAdmin, onRemove, removing,
}: {
	member: WorkspaceMember
	index: number
	isCurrentUser: boolean
	isAdmin: boolean
	onRemove: () => void
	removing: boolean
}) {
	const cfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.member
	const RoleIcon = cfg.icon
	const displayName = [member.user.firstName, member.user.lastName].filter(Boolean).join(' ') || member.user.username || member.user.email
	const initials = displayName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

	return (
		<motion.div
			custom={index}
			variants={FADE_UP}
			initial="hidden"
			animate="show"
			className="flex items-center gap-3 px-4 py-3"
		>
			<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
				{initials}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
					{isCurrentUser && (
						<span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">vous</span>
					)}
				</div>
				<p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
			</div>
			<div className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:flex ${cfg.color}`}>
				<RoleIcon className="size-3" />
				{cfg.label}
			</div>
			{isAdmin && !isCurrentUser && (
				<button
					onClick={onRemove}
					disabled={removing}
					className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40 cursor-pointer"
					title="Retirer du workspace"
				>
					<MinusCircleIcon className="size-3.5" />
				</button>
			)}
		</motion.div>
	)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function WorkspaceSkeleton() {
	return (
		<div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
			<div className="h-4 w-24 animate-pulse rounded bg-muted" />
			<div className="flex items-center gap-4">
				<div className="h-12 w-12 animate-pulse rounded-2xl bg-muted" />
				<div className="space-y-2">
					<div className="h-6 w-48 animate-pulse rounded bg-muted" />
					<div className="h-3 w-24 animate-pulse rounded bg-muted" />
				</div>
			</div>
			<div className="grid grid-cols-4 gap-3">
				{[0, 1, 2, 3].map((i) => (
					<div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
				))}
			</div>
		</div>
	)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number, currency: string): string {
	return `${value.toLocaleString('fr-MG')} ${currency}`
}
