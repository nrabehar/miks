import { workspacesApi, type Workspace } from '#/lib/api/workspaces.api'
import { useAuthStore } from '#/stores/auth.store'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
	ArrowRightIcon,
	BuildingIcon,
	CheckIcon,
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

// Animation variants
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
			toast.success(`Workspace « ${ws.name} » créé`)
		},
		onError: (err: any) => {
			const msg = err.response?.data?.message ?? 'Une erreur est survenue'
			toast.error(Array.isArray(msg) ? msg.join(' · ') : msg)
		},
	})

	const totalMembers = workspaces.reduce((s, w) => s + w.workspaceMembers.length, 0)
	const greeting = getGreeting()
	const firstName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'vous'

	const handleOpenCreate = () => {
		setShowCreate(true)
		setTimeout(() => inputRef.current?.focus(), 80)
	}

	const handleSubmitCreate = () => {
		if (newName.trim().length >= 3) createMutation.mutate()
	}

	return (
		<div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
			{/* En-tête */}
			<motion.div custom={0} variants={FADE_UP} initial="hidden" animate="show">
				<p className="text-sm font-medium text-muted-foreground">{greeting}</p>
				<h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
					{firstName} 👋
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Bienvenue sur votre tableau de bord Miks.
				</p>
			</motion.div>

			{/* Alerte 2FA si désactivée */}
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
							className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/30"
						>
							<ShieldAlertIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
									Sécurisez votre compte
								</p>
								<p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
									Activez l'authentification à deux facteurs pour protéger vos workspaces.
								</p>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Statistiques */}
			<motion.section
				custom={1}
				variants={FADE_UP}
				initial="hidden"
				animate="show"
				aria-labelledby="stats-heading"
			>
				<h2 id="stats-heading" className="sr-only">Statistiques</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<StatCard
						icon={<BuildingIcon className="size-5" />}
						label="Workspaces"
						value={isLoading ? null : workspaces.length}
						color="blue"
					/>
					<StatCard
						icon={<UsersIcon className="size-5" />}
						label="Membres total"
						value={isLoading ? null : totalMembers}
						color="violet"
					/>
					<StatCard
						icon={
							user?.twoFaEnabled ? (
								<ShieldCheckIcon className="size-5" />
							) : (
								<ShieldAlertIcon className="size-5" />
							)
						}
						label="Sécurité 2FA"
						value={user?.twoFaEnabled ? 'Active' : 'Inactive'}
						color={user?.twoFaEnabled ? 'green' : 'amber'}
						isText
					/>
				</div>
			</motion.section>

			{/* Section Workspaces */}
			<motion.section
				custom={2}
				variants={FADE_UP}
				initial="hidden"
				animate="show"
				aria-labelledby="workspaces-heading"
				className="space-y-4"
			>
				<div className="flex items-center justify-between">
					<h2
						id="workspaces-heading"
						className="text-lg font-semibold tracking-tight text-foreground"
					>
						Mes workspaces
					</h2>
					<button
						onClick={handleOpenCreate}
						className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all duration-150 cursor-pointer"
						aria-label="Créer un workspace"
					>
						<PlusIcon className="size-4" aria-hidden="true" />
						<span>Nouveau</span>
					</button>
				</div>

				{/* Formulaire de création inline */}
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
								<label htmlFor="new-workspace-name" className="sr-only">
									Nom du workspace
								</label>
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
									aria-required="true"
									aria-describedby="new-workspace-hint"
								/>
								<p id="new-workspace-hint" className="sr-only">
									Minimum 3 caractères, maximum 60. Appuyez sur Entrée pour confirmer.
								</p>
								<button
									onClick={handleSubmitCreate}
									disabled={createMutation.isPending || newName.trim().length < 3}
									className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
									aria-label="Confirmer la création"
								>
									{createMutation.isPending ? (
										<span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
									) : (
										<CheckIcon className="size-4" />
									)}
									<span>Créer</span>
								</button>
								<button
									onClick={() => { setShowCreate(false); setNewName('') }}
									className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
									aria-label="Annuler"
								>
									<XIcon className="size-4" />
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Liste des workspaces */}
				{isLoading ? (
					<WorkspacesSkeleton />
				) : workspaces.length === 0 ? (
					<EmptyWorkspaces onCreateClick={handleOpenCreate} />
				) : (
					<div className="grid gap-3 sm:grid-cols-2">
						{workspaces.map((ws, i) => (
							<WorkspaceCard key={ws.id} workspace={ws} index={i} />
						))}
					</div>
				)}
			</motion.section>

			{/* Actions rapides */}
			<motion.section
				custom={3}
				variants={FADE_UP}
				initial="hidden"
				animate="show"
				aria-labelledby="actions-heading"
				className="space-y-3"
			>
				<h2
					id="actions-heading"
					className="text-lg font-semibold tracking-tight text-foreground"
				>
					Actions rapides
				</h2>
				<div className="grid gap-3 sm:grid-cols-2">
					<ActionCard
						icon={<TrendingUpIcon className="size-5 text-blue-500 dark:text-blue-400" />}
						title="Créer un workspace"
						description="Lancez votre premier groupe coopératif et invitez des membres."
						onClick={handleOpenCreate}
					/>
					{!user?.twoFaEnabled && (
						<ActionCard
							icon={<ShieldCheckIcon className="size-5 text-amber-500" />}
							title="Activer la 2FA"
							description="Renforcez la sécurité de votre compte avec un second facteur."
							onClick={() => toast.info('Configuration 2FA — bientôt disponible')}
						/>
					)}
				</div>
			</motion.section>
		</div>
	)
}

// ─── Sous-composants ────────────────────────────────────────────────────────

type StatColor = 'blue' | 'violet' | 'green' | 'amber'

const COLOR_MAP: Record<StatColor, string> = {
	blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
	violet: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40',
	green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
	amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
}

function StatCard({
	icon,
	label,
	value,
	color,
	isText = false,
}: {
	icon: React.ReactNode
	label: string
	value: number | string | null
	color: StatColor
	isText?: boolean
}) {
	return (
		<div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
			<div className={`flex h-10 w-10 items-center justify-center rounded-lg ${COLOR_MAP[color]}`}>
				{icon}
			</div>
			<div>
				<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{label}
				</p>
				{value === null ? (
					<div className="mt-1.5 h-7 w-16 animate-pulse rounded bg-muted" />
				) : (
					<p className={`mt-0.5 ${isText ? 'text-lg' : 'text-2xl'} font-bold tabular-nums text-foreground`}>
						{value}
					</p>
				)}
			</div>
		</div>
	)
}

function WorkspaceCard({ workspace, index }: { workspace: Workspace; index: number }) {
	const memberCount = workspace.workspaceMembers.length
	const initials = workspace.name
		.split(' ')
		.slice(0, 2)
		.map((w) => w[0])
		.join('')
		.toUpperCase()

	return (
		<motion.article
			custom={index}
			variants={FADE_UP}
			initial="hidden"
			animate="show"
			className="group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-border/60 transition-all duration-200 cursor-pointer focus-within:ring-2 focus-within:ring-primary/30"
		>
			<div className="flex items-start gap-3">
				<div
					className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary"
					aria-hidden="true"
				>
					{initials}
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="truncate font-semibold text-foreground leading-snug">{workspace.name}</h3>
					<p className="text-xs text-muted-foreground">/{workspace.slug}</p>
				</div>
			</div>

			<div className="flex items-center justify-between border-t border-border pt-3">
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<UsersIcon className="size-3.5" aria-hidden="true" />
					<span>
						{memberCount} membre{memberCount !== 1 ? 's' : ''}
					</span>
				</div>
				<span className="flex items-center gap-0.5 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-150">
					Voir
					<ArrowRightIcon className="size-3" aria-hidden="true" />
				</span>
			</div>
		</motion.article>
	)
}

function WorkspacesSkeleton() {
	return (
		<div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Chargement">
			{[0, 1, 2].map((i) => (
				<div key={i} className="h-29 animate-pulse rounded-xl bg-muted" />
			))}
		</div>
	)
}

function EmptyWorkspaces({ onCreateClick }: { onCreateClick: () => void }) {
	return (
		<div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
				<BuildingIcon className="size-7 text-primary" aria-hidden="true" />
			</div>
			<div className="space-y-1">
				<p className="font-semibold text-foreground">Aucun workspace pour l'instant</p>
				<p className="text-sm text-muted-foreground max-w-xs">
					Créez votre premier groupe coopératif pour commencer à gérer vos membres et vos contributions.
				</p>
			</div>
			<button
				onClick={onCreateClick}
				className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all duration-150 cursor-pointer"
			>
				<PlusIcon className="size-4" aria-hidden="true" />
				Créer un workspace
			</button>
		</div>
	)
}

function ActionCard({
	icon,
	title,
	description,
	onClick,
}: {
	icon: React.ReactNode
	title: string
	description: string
	onClick: () => void
}) {
	return (
		<button
			onClick={onClick}
			className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm hover:shadow-md hover:border-border/60 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 w-full"
		>
			<div className="mt-0.5 shrink-0">{icon}</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-150">
					{title}
				</p>
				<p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
			</div>
			<ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors duration-150" aria-hidden="true" />
		</button>
	)
}

function getGreeting(): string {
	const h = new Date().getHours()
	if (h < 12) return 'Bonjour,'
	if (h < 18) return 'Bon après-midi,'
	return 'Bonsoir,'
}
