import { workspacesApi, type Workspace } from '#/lib/api/workspaces.api'
import { useAuthStore } from '#/stores/auth.store'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
	ArrowRightIcon,
	BuildingIcon,
	CheckIcon,
	ChevronRightIcon,
	PlusIcon,
	ShieldAlertIcon,
	ShieldCheckIcon,
	TrendingUpIcon,
	UsersIcon,
	XIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authed/dashboard')({
	staticData: { title: 'Dashboard' },
	component: DashboardPage,
})

const FADE_UP = {
	hidden: { opacity: 0, y: 16 },
	show: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { duration: 0.3, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
	}),
}

function DashboardPage() {
	const user = useAuthStore((s) => s.user)
	const queryClient = useQueryClient()
	const [showCreate, setShowCreate] = useState(false)
	const [newName, setNewName] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	const { data: workspaces = [], isLoading } = useQuery({
		queryKey: ['workspaces'],
		queryFn: workspacesApi.list,
	})

	const createMutation = useMutation({
		mutationFn: () => workspacesApi.create({ name: newName.trim() }),
		onSuccess: (ws) => {
			setNewName('')
			setShowCreate(false)
			queryClient.invalidateQueries({ queryKey: ['workspaces'] })
			toast.success(`Workspace « ${ws.name} » créé`)
		},
		onError: (err: any) => {
			const msg = err.response?.data?.message ?? 'Une erreur est survenue'
			toast.error(Array.isArray(msg) ? msg.join(' · ') : msg)
		},
	})

	const totalMembers = workspaces.reduce((s, w) => s + w.workspaceMembers.length, 0)
	const greeting = getGreeting()
	const firstName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'vous'
	const hasWorkspaces = workspaces.length > 0

	const handleOpenCreate = () => {
		setShowCreate(true)
		setTimeout(() => inputRef.current?.focus(), 80)
	}

	const handleSubmitCreate = () => {
		if (newName.trim().length >= 3) createMutation.mutate()
	}

	return (
		<div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

			{/* Header */}
			<motion.div custom={0} variants={FADE_UP} initial="hidden" animate="show">
				<p className="text-sm font-medium text-muted-foreground">{greeting}</p>
				<h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
					{firstName} 👋
				</h1>
			</motion.div>

			{/* 2FA security alert */}
			<AnimatePresence>
				{!user?.twoFaEnabled && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.25 }}
					>
						<div
							role="alert"
							className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50/80 p-4 dark:border-amber-800/40 dark:bg-amber-950/20"
						>
							<ShieldAlertIcon className="mt-0.5 size-4.5 shrink-0 text-amber-600 dark:text-amber-400" />
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
									Sécurisez votre compte
								</p>
								<p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">
									Activez la 2FA pour protéger vos workspaces contre les accès non autorisés.
								</p>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* KPI strip */}
			<motion.div custom={1} variants={FADE_UP} initial="hidden" animate="show">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<KpiCard
						label="Workspaces"
						value={isLoading ? null : workspaces.length}
						icon={<BuildingIcon className="size-4" />}
						colorClass="text-primary bg-primary/10"
					/>
					<KpiCard
						label="Membres"
						value={isLoading ? null : totalMembers}
						icon={<UsersIcon className="size-4" />}
						colorClass="text-violet-600 dark:text-violet-400 bg-violet-500/10"
					/>
					<KpiCard
						label="Groupes actifs"
						value={isLoading ? null : workspaces.filter((w) => w.workspaceMembers.length > 1).length}
						icon={<TrendingUpIcon className="size-4" />}
						colorClass="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
					/>
					<KpiCard
						label="Sécurité 2FA"
						value={user?.twoFaEnabled ? 'Active' : 'Inactive'}
						icon={user?.twoFaEnabled
							? <ShieldCheckIcon className="size-4" />
							: <ShieldAlertIcon className="size-4" />}
						colorClass={user?.twoFaEnabled
							? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
							: 'text-amber-600 dark:text-amber-400 bg-amber-500/10'}
						isText
					/>
				</div>
			</motion.div>

			{/* Onboarding — only if no workspaces */}
			<AnimatePresence>
				{!isLoading && !hasWorkspaces && (
					<motion.section
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -12 }}
						transition={{ duration: 0.3 }}
						aria-labelledby="onboarding-heading"
					>
						<div className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/4">
							<div className="border-b border-primary/12 bg-primary/6 px-6 py-4">
								<h2 id="onboarding-heading" className="text-sm font-semibold text-primary">
									Démarrer en 3 étapes
								</h2>
								<p className="mt-0.5 text-xs text-muted-foreground">
									Votre groupe coopératif opérationnel en moins de 5 minutes.
								</p>
							</div>
							<div className="divide-y divide-border/40">
								{ONBOARDING_STEPS.map((step, i) => (
									<div key={step.label} className="flex items-start gap-4 px-6 py-4">
										<div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
											i === 0 ? 'bg-primary text-primary-foreground' : 'border-2 border-border text-muted-foreground'
										}`}>
											{i + 1}
										</div>
										<div className="min-w-0 flex-1">
											<p className={`text-sm font-semibold ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
												{step.label}
											</p>
											<p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
										</div>
										{i === 0 && (
											<button
												onClick={handleOpenCreate}
												className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
											>
												Commencer
											</button>
										)}
									</div>
								))}
							</div>
						</div>
					</motion.section>
				)}
			</AnimatePresence>

			{/* Workspaces section */}
			<motion.section
				custom={2}
				variants={FADE_UP}
				initial="hidden"
				animate="show"
				aria-labelledby="workspaces-heading"
				className="space-y-4"
			>
				<div className="flex items-center justify-between">
					<h2 id="workspaces-heading" className="text-base font-semibold tracking-tight text-foreground">
						Mes workspaces
					</h2>
					<button
						onClick={handleOpenCreate}
						className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
						aria-label="Créer un workspace"
					>
						<PlusIcon className="size-3.5" />
						Nouveau
					</button>
				</div>

				{/* Create form */}
				<AnimatePresence>
					{showCreate && (
						<motion.div
							key="create-form"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
							className="overflow-hidden"
						>
							<div className="flex gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
								<label htmlFor="new-workspace-name" className="sr-only">Nom du workspace</label>
								<input
									id="new-workspace-name"
									ref={inputRef}
									type="text"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') handleSubmitCreate()
										if (e.key === 'Escape') setShowCreate(false)
									}}
									placeholder="Ex : Tontine Liberté 2025"
									maxLength={60}
									className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-shadow"
								/>
								<button
									onClick={handleSubmitCreate}
									disabled={createMutation.isPending || newName.trim().length < 3}
									className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
								>
									{createMutation.isPending ? (
										<span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
									) : (
										<CheckIcon className="size-4" />
									)}
									Créer
								</button>
								<button
									onClick={() => { setShowCreate(false); setNewName('') }}
									className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
								>
									<XIcon className="size-4" />
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{isLoading ? (
					<WorkspacesSkeleton />
				) : workspaces.length === 0 ? (
					<EmptyWorkspaces onCreateClick={handleOpenCreate} />
				) : (
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{workspaces.map((ws, i) => (
							<WorkspaceCard key={ws.id} workspace={ws} index={i} />
						))}
					</div>
				)}
			</motion.section>
		</div>
	)
}

// ─── Onboarding steps ────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
	{ label: 'Créer votre workspace', description: 'Donnez un nom à votre groupe coopératif.' },
	{ label: 'Inviter vos membres', description: 'Ajoutez les membres par email — ils reçoivent une invitation directe.' },
	{ label: 'Saisir les cotisations', description: 'Enregistrez vos premières cotisations pour activer l\'Equity Engine.' },
]

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
	icon,
	label,
	value,
	colorClass,
	isText = false,
}: {
	icon: React.ReactNode
	label: string
	value: number | string | null
	colorClass: string
	isText?: boolean
}) {
	return (
		<div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
			<div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
				{icon}
			</div>
			<div className="min-w-0">
				<p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{label}
				</p>
				{value === null ? (
					<div className="mt-1 h-5 w-10 animate-pulse rounded bg-muted" />
				) : (
					<p className={`mt-0.5 font-bold tabular-nums text-foreground ${isText ? 'text-sm' : 'text-xl'}`}>
						{value}
					</p>
				)}
			</div>
		</div>
	)
}

// ─── Workspace Card ───────────────────────────────────────────────────────────

function WorkspaceCard({ workspace, index }: { workspace: Workspace; index: number }) {
	const memberCount = workspace.workspaceMembers.length
	const myMember = workspace.workspaceMembers.find(() => true)
	const role = myMember?.role ?? 'member'
	const initials = workspace.name
		.split(' ')
		.slice(0, 2)
		.map((w) => w[0])
		.join('')
		.toUpperCase()

	const roleColors: Record<string, string> = {
		admin: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
		member: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
		observer: 'text-muted-foreground bg-muted/60',
	}

	return (
		<motion.article
			custom={index}
			variants={FADE_UP}
			initial="hidden"
			animate="show"
			className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/30"
		>
			<div className="flex items-start gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
					{initials}
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="truncate font-semibold text-foreground leading-snug text-sm">
						{workspace.name}
					</h3>
					<p className="text-xs text-muted-foreground">/{workspace.slug}</p>
				</div>
				<span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${roleColors[role] ?? roleColors.member}`}>
					{role}
				</span>
			</div>

			<div className="flex items-center justify-between border-t border-border/60 pt-3">
				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					<UsersIcon className="size-3.5" />
					{memberCount} membre{memberCount !== 1 ? 's' : ''}
				</div>
				<span className="flex items-center gap-0.5 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-150">
					Gérer
					<ChevronRightIcon className="size-3" />
				</span>
			</div>

			<Link
				to="/workspace/$id"
				params={{ id: workspace.id }}
				className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
				aria-label={`Ouvrir ${workspace.name}`}
			/>
		</motion.article>
	)
}

// ─── Empty & Skeleton ─────────────────────────────────────────────────────────

function WorkspacesSkeleton() {
	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
			{[0, 1, 2].map((i) => (
				<div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
			))}
		</div>
	)
}

function EmptyWorkspaces({ onCreateClick }: { onCreateClick: () => void }) {
	return (
		<div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
				<BuildingIcon className="size-7 text-primary" />
			</div>
			<div className="space-y-1">
				<p className="font-semibold text-foreground">Aucun workspace pour l'instant</p>
				<p className="text-sm text-muted-foreground max-w-xs">
					Créez votre premier groupe coopératif pour commencer à gérer cotisations et membres.
				</p>
			</div>
			<button
				onClick={onCreateClick}
				className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
			>
				<PlusIcon className="size-4" />
				Créer un workspace
			</button>
		</div>
	)
}

function getGreeting(): string {
	const h = new Date().getHours()
	if (h < 12) return 'Bonjour,'
	if (h < 18) return 'Bon après-midi,'
	return 'Bonsoir,'
}
