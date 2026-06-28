import { workspacesApi, type WorkspaceMember } from '#/lib/api/workspaces.api'
import { useAuthStore } from '#/stores/auth.store'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
	ArrowLeftIcon,
	CheckIcon,
	CrownIcon,
	EyeIcon,
	MailIcon,
	PlusIcon,
	ShieldIcon,
	TrashIcon,
	UserIcon,
	UsersIcon,
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
		transition: { duration: 0.28, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
	}),
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
	admin: { label: 'Admin', icon: CrownIcon, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' },
	member: { label: 'Membre', icon: UserIcon, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40' },
	observer: { label: 'Observateur', icon: EyeIcon, color: 'text-muted-foreground bg-muted/60' },
}

function WorkspacePage() {
	const { id } = Route.useParams()
	const user = useAuthStore((s) => s.user)
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	const [showInvite, setShowInvite] = useState(false)
	const [inviteEmail, setInviteEmail] = useState('')
	const [inviteRole, setInviteRole] = useState<'member' | 'observer'>('member')
	const inviteInputRef = useRef<HTMLInputElement>(null)

	const { data: workspace, isLoading, isError } = useQuery({
		queryKey: ['workspace', id],
		queryFn: () => workspacesApi.get(id),
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
				<p className="mt-1 text-sm text-muted-foreground">Vous n'êtes peut-être pas membre de ce workspace.</p>
				<Link to="/dashboard" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
					<ArrowLeftIcon className="size-3.5" /> Retour au dashboard
				</Link>
			</div>
		)
	}

	const currentMember = workspace.workspaceMembers.find((m) => m.userId === user?.id)
	const isAdmin = currentMember?.role === 'admin'
	const totalShares = workspace.workspaceMembers.reduce((s, m) => s + (m.totalShares ?? 0), 0)

	const handleOpenInvite = () => {
		setShowInvite(true)
		setTimeout(() => inviteInputRef.current?.focus(), 80)
	}

	const handleSubmitInvite = () => {
		if (inviteEmail.trim().includes('@')) inviteMutation.mutate()
	}

	const handleDelete = () => {
		if (!window.confirm(`Supprimer définitivement le workspace « ${workspace.name} » ? Cette action est irréversible.`)) return
		deleteWorkspaceMutation.mutate()
	}

	return (
		<div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
			{/* Breadcrumb */}
			<motion.div custom={0} variants={FADE_UP} initial="hidden" animate="show">
				<Link
					to="/dashboard"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeftIcon className="size-3.5" />
					Dashboard
				</Link>
			</motion.div>

			{/* Header */}
			<motion.div custom={1} variants={FADE_UP} initial="hidden" animate="show" className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-4">
					<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
						{workspace.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
							{workspace.name}
						</h1>
						<p className="text-sm text-muted-foreground">/{workspace.slug}</p>
					</div>
				</div>
				{isAdmin && (
					<button
						onClick={handleDelete}
						disabled={deleteWorkspaceMutation.isPending}
						className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/8 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
					>
						<TrashIcon className="size-3.5" />
						Supprimer
					</button>
				)}
			</motion.div>

			{/* Stats */}
			<motion.div custom={2} variants={FADE_UP} initial="hidden" animate="show">
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
					<StatChip
						label="Membres"
						value={workspace.workspaceMembers.length}
						icon={<UsersIcon className="size-4" />}
						color="blue"
					/>
					<StatChip
						label="Parts totales"
						value={totalShares.toLocaleString('fr-FR')}
						icon={<ShieldIcon className="size-4" />}
						color="violet"
					/>
					<StatChip
						label="Mon rôle"
						value={ROLE_CONFIG[currentMember?.role ?? 'member']?.label ?? '—'}
						icon={<UserIcon className="size-4" />}
						color="green"
					/>
				</div>
			</motion.div>

			{/* Members section */}
			<motion.section
				custom={3}
				variants={FADE_UP}
				initial="hidden"
				animate="show"
				aria-labelledby="members-heading"
				className="space-y-4"
			>
				<div className="flex items-center justify-between">
					<h2 id="members-heading" className="text-lg font-semibold tracking-tight text-foreground">
						Membres
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
								<label htmlFor="invite-email" className="sr-only">Email du membre à inviter</label>
								<input
									id="invite-email"
									ref={inviteInputRef}
									type="email"
									value={inviteEmail}
									onChange={(e) => setInviteEmail(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') handleSubmitInvite()
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
									onClick={handleSubmitInvite}
									disabled={inviteMutation.isPending || !inviteEmail.trim().includes('@')}
									className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
								>
									{inviteMutation.isPending ? (
										<span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
									) : (
										<MailIcon className="size-4" />
									)}
									Inviter
								</button>
								<button
									onClick={() => { setShowInvite(false); setInviteEmail('') }}
									className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
								>
									<XIcon className="size-4" />
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Members list */}
				<div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
					{workspace.workspaceMembers.map((member, i) => (
						<MemberRow
							key={member.id}
							member={member}
							index={i}
							isCurrentUser={member.userId === user?.id}
							isAdmin={isAdmin}
							totalShares={totalShares}
							onRemove={() => removeMemberMutation.mutate(member.userId)}
							removing={removeMemberMutation.isPending}
						/>
					))}
				</div>
			</motion.section>
		</div>
	)
}

function MemberRow({
	member,
	index,
	isCurrentUser,
	isAdmin,
	totalShares,
	onRemove,
	removing,
}: {
	member: WorkspaceMember
	index: number
	isCurrentUser: boolean
	isAdmin: boolean
	totalShares: number
	onRemove: () => void
	removing: boolean
}) {
	const cfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.member
	const RoleIcon = cfg.icon
	const displayName = [member.user.firstName, member.user.lastName].filter(Boolean).join(' ') || member.user.username || member.user.email
	const initials = displayName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
	const sharePercent = totalShares > 0 ? ((member.totalShares ?? 0) / totalShares) * 100 : 0

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
				<div className="flex items-center gap-2">
					<p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
					{isCurrentUser && (
						<span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">vous</span>
					)}
				</div>
				<p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
			</div>

			<div className="hidden shrink-0 flex-col items-end sm:flex">
				<p className="text-xs font-semibold text-foreground tabular-nums">{sharePercent.toFixed(1)}%</p>
				<p className="text-[10px] text-muted-foreground">des parts</p>
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
					aria-label={`Retirer ${displayName}`}
					title="Retirer du workspace"
				>
					<XIcon className="size-3.5" />
				</button>
			)}
		</motion.div>
	)
}

function StatChip({
	label,
	value,
	icon,
	color,
}: {
	label: string
	value: number | string
	icon: React.ReactNode
	color: 'blue' | 'violet' | 'green'
}) {
	const colors = {
		blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
		violet: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40',
		green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
	}
	return (
		<div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
			<div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors[color]}`}>
				{icon}
			</div>
			<div>
				<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
				<p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{value}</p>
			</div>
		</div>
	)
}

function WorkspaceSkeleton() {
	return (
		<div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
			<div className="h-5 w-24 animate-pulse rounded bg-muted" />
			<div className="flex items-center gap-4">
				<div className="h-14 w-14 animate-pulse rounded-2xl bg-muted" />
				<div className="space-y-2">
					<div className="h-7 w-48 animate-pulse rounded bg-muted" />
					<div className="h-4 w-24 animate-pulse rounded bg-muted" />
				</div>
			</div>
			<div className="grid grid-cols-3 gap-4">
				{[0, 1, 2].map((i) => (
					<div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
				))}
			</div>
			<div className="space-y-3">
				{[0, 1, 2].map((i) => (
					<div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
				))}
			</div>
		</div>
	)
}
