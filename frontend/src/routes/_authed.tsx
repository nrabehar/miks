import { authApi } from '#/lib/api/auth.api'
import { apiClient } from '#/lib/api/client'
import { cn } from '#/lib/utils'
import { isAuthenticated, useAuthStore, type AuthUser } from '#/stores/auth.store'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
	Link,
	Outlet,
	createFileRoute,
	redirect,
	useLocation,
	useNavigate,
} from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
	BuildingIcon,
	LayoutDashboardIcon,
	LogOutIcon,
	MenuIcon,
	SettingsIcon,
	ShieldCheckIcon,
	UsersIcon,
	XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { MiksLogo } from '#/components/brand/logo'
import { NotificationsBell } from '#/components/NotificationsBell'
import { toast } from 'sonner'

type NavItem =
	| { to: '/dashboard'; label: string; icon: React.ElementType; disabled?: false }
	| { label: string; icon: React.ElementType; disabled: true }

const NAV_ITEMS: NavItem[] = [
	{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
	{ label: 'Workspaces', icon: BuildingIcon, disabled: true },
	{ label: 'Membres', icon: UsersIcon, disabled: true },
]

export const Route = createFileRoute('/_authed')({
	beforeLoad: async () => {
		const state = useAuthStore.getState()
		if (isAuthenticated(state)) return

		try {
			const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh', {})
			const user = await apiClient
				.get<AuthUser>('/auth/me', {
					headers: { Authorization: `Bearer ${data.accessToken}` },
				})
				.then((r) => r.data)
			useAuthStore.getState().setSession({ user, accessToken: data.accessToken })
		} catch {
			useAuthStore.getState().clearSession()
			throw redirect({ to: '/auth/login' })
		}
	},
	component: AppShell,
})

function AppShell() {
	const [drawerOpen, setDrawerOpen] = useState(false)

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			{/* Skip to main content — accessibilité clavier */}
			<a
				href="#main-content"
				className="fixed -top-full left-4 z-[9999] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg focus:top-4 focus:outline-none transition-[top] duration-150"
			>
				Aller au contenu principal
			</a>

			{/* Sidebar — desktop */}
			<AppSidebar className="hidden lg:flex" onClose={() => {}} />

			{/* Overlay mobile */}
			<AnimatePresence>
				{drawerOpen && (
					<motion.div
						key="overlay"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
						onClick={() => setDrawerOpen(false)}
						aria-hidden="true"
					/>
				)}
			</AnimatePresence>

			{/* Drawer — mobile */}
			<AnimatePresence>
				{drawerOpen && (
					<motion.div
						key="drawer"
						initial={{ x: '-100%' }}
						animate={{ x: 0 }}
						exit={{ x: '-100%' }}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
						role="dialog"
						aria-modal="true"
						aria-label="Navigation"
					>
						<AppSidebar className="flex h-full" onClose={() => setDrawerOpen(false)} />
					</motion.div>
				)}
			</AnimatePresence>

			{/* Zone principale */}
			<div className="flex flex-1 flex-col min-w-0 overflow-hidden">
				{/* Header mobile */}
				<header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 lg:hidden">
					<button
						onClick={() => setDrawerOpen(true)}
						className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150 cursor-pointer"
						aria-label="Ouvrir la navigation"
					>
						<MenuIcon className="size-5" />
					</button>
					<Link to="/dashboard" className="flex min-w-0 flex-1 items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
						<MiksLogo className="h-7 w-7" />
						<span className="text-base font-bold tracking-tight">Miks</span>
					</Link>
					<NotificationsBell />
				</header>

				{/* Contenu de la page */}
				<main
					id="main-content"
					className="flex-1 overflow-auto focus:outline-none"
					tabIndex={-1}
				>
					<Outlet />
				</main>
			</div>
		</div>
	)
}

function AppSidebar({
	className,
	onClose,
}: {
	className?: string
	onClose: () => void
}) {
	const location = useLocation()
	const user = useAuthStore((s) => s.user)
	const clearSession = useAuthStore((s) => s.clearSession)
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	const logout = useMutation({
		mutationFn: authApi.logout,
		onSettled: () => {
			clearSession()
			queryClient.clear()
			navigate({ to: '/auth/login', replace: true })
		},
		onError: () => toast.error('Erreur lors de la déconnexion'),
	})

	const initials = (() => {
		const name = user?.displayName ?? user?.email ?? ''
		return name
			.split(/[\s@._-]/)
			.filter(Boolean)
			.slice(0, 2)
			.map((s) => s[0]?.toUpperCase() ?? '')
			.join('')
	})()

	return (
		<aside
			className={cn(
				'flex flex-col w-64 shrink-0 border-r border-border bg-sidebar',
				className,
			)}
		>
			{/* Logo */}
			<div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
				<Link
					to="/dashboard"
					className="flex min-w-0 flex-1 items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
					onClick={onClose}
				>
					<MiksLogo className="h-8 w-8" />
					<span className="text-lg font-bold tracking-tight text-sidebar-foreground">
						Miks
					</span>
				</Link>
				<div className="flex items-center gap-1">
					<NotificationsBell />
					<button
						onClick={onClose}
						className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden cursor-pointer"
						aria-label="Fermer la navigation"
					>
						<XIcon className="size-4" />
					</button>
				</div>
			</div>

			{/* Navigation principale */}
			<nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
				<div className="mb-1 px-3">
					<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
						Menu
					</p>
				</div>
				<ul className="space-y-0.5" role="list">
					{NAV_ITEMS.map((item, i) => {
						if (item.disabled) {
							return (
								<li key={i}>
									<button
										disabled
										className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/35 cursor-not-allowed select-none"
										title="Bientôt disponible"
									>
										<item.icon className="size-[18px] shrink-0" />
										<span>{item.label}</span>
										<span className="ml-auto text-[10px] font-semibold uppercase tracking-wide bg-muted/60 text-muted-foreground/60 px-1.5 py-0.5 rounded-full">
											soon
										</span>
									</button>
								</li>
							)
						}

						const active =
							location.pathname === item.to ||
							location.pathname.startsWith(item.to + '/')

						return (
							<li key={item.to}>
								<Link
									to={item.to}
									onClick={onClose}
									aria-current={active ? 'page' : undefined}
									className={cn(
										'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer',
										active
											? 'bg-primary/10 text-primary'
											: 'text-sidebar-foreground/65 hover:bg-muted hover:text-sidebar-foreground',
									)}
								>
									<item.icon
										className={cn(
											'size-[18px] shrink-0 transition-colors',
											active ? 'text-primary' : '',
										)}
									/>
									{item.label}
									{active && (
										<motion.span
											layoutId="nav-indicator"
											className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
											transition={{ type: 'spring', stiffness: 380, damping: 30 }}
										/>
									)}
								</Link>
							</li>
						)
					})}
				</ul>

				{/* Section Compte */}
				<div className="mt-6 mb-1 px-3">
					<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
						Compte
					</p>
				</div>
				<ul className="space-y-0.5" role="list">
					<li>
						<button
							disabled
							className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/35 cursor-not-allowed select-none"
							title="Bientôt disponible"
						>
							<SettingsIcon className="size-[18px] shrink-0" />
							<span>Paramètres</span>
							<span className="ml-auto text-[10px] font-semibold uppercase tracking-wide bg-muted/60 text-muted-foreground/60 px-1.5 py-0.5 rounded-full">
								soon
							</span>
						</button>
					</li>
				</ul>
			</nav>

			{/* Profil utilisateur */}
			<div className="shrink-0 border-t border-border p-3">
				<div className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted/50 transition-colors group">
					{/* Avatar initiales */}
					<div
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/20"
						aria-hidden="true"
					>
						{initials}
					</div>

					{/* Infos */}
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">
							{user?.displayName ?? user?.email?.split('@')[0] ?? '—'}
						</p>
						<p className="truncate text-xs text-muted-foreground">{user?.email}</p>
					</div>

					{/* Badges + Logout */}
					<div className="flex shrink-0 items-center gap-1.5">
						{user?.twoFaEnabled && (
							<span title="2FA activé" aria-label="Authentification à deux facteurs activée">
								<ShieldCheckIcon className="size-3.5 text-emerald-500" />
							</span>
						)}
						<button
							onClick={() => logout.mutate()}
							disabled={logout.isPending}
							className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40 cursor-pointer"
							aria-label="Se déconnecter"
							title="Déconnexion"
						>
							<LogOutIcon className="size-4" />
						</button>
					</div>
				</div>
			</div>
		</aside>
	)
}
