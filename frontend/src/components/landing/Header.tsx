import { type SupportedLanguage } from '#/i18n/config'
import { useLanguage } from '#/i18n/useLanguage'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
	ChevronDownIcon,
	GlobeIcon,
	MenuIcon,
	MonitorIcon,
	MoonIcon,
	SunIcon,
	XIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from '@/stores/theme.store'
import { useActiveSection } from '@/hook/useActiveSection'

interface NavLink {
	key: string
	href: string
	descriptionKey: string
}

const NAV_LINK_KEYS: readonly NavLink[] = [
	{ key: 'product', href: '#features', descriptionKey: 'product' },
	{ key: 'howItWorks', href: '#how', descriptionKey: 'howItWorks' },
	{ key: 'security', href: '#security', descriptionKey: 'security' },
	{ key: 'pricing', href: '#pricing', descriptionKey: 'pricing' },
] as const

const SECTION_IDS = ['features', 'how', 'security', 'pricing', 'faq']

export const Header = () => {
	const { language, setLanguage, languages } = useLanguage()
	const { t } = useTranslation()
	const theme = useThemeStore((s) => s.theme)
	const resolvedTheme = useThemeStore((s) => s.resolved)
	const setTheme = useThemeStore((s) => s.setTheme)
	const [scrolled, setScrolled] = useState(false)
	const [mobileOpen, setMobileOpen] = useState(false)
	const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
	const activeSection = useActiveSection(SECTION_IDS)

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 20)
		onScroll()
		window.addEventListener('scroll', onScroll, { passive: true })
		return () => window.removeEventListener('scroll', onScroll)
	}, [])

	const navItems = useMemo(
		() =>
			NAV_LINK_KEYS.map((link) => ({
				...link,
				label: t(`landing.nav.${link.key}`),
				description: t(`landing.nav.${link.descriptionKey}`),
			})),
		[t],
	)

	const cycleTheme = () => {
		const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
		setTheme(next)
	}

	const ThemeIcon =
		theme === 'system' ? MonitorIcon : resolvedTheme === 'dark' ? MoonIcon : SunIcon

	return (
		<motion.header
			initial={false}
			animate={{
				boxShadow: scrolled
					? '0 4px 30px -10px rgba(0,0,0,0.1)'
					: '0 0 0 rgba(0,0,0,0)',
				y: scrolled ? 4 : 0,
			}}
			transition={{ duration: 0.2 }}
			className={cn(
				'fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-colors',
				scrolled
					? 'border-border/60 bg-background/80'
					: 'border-transparent bg-background/40',
			)}
		>
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
				{/* Logo */}
				<Link to="/" className="flex shrink-0 items-center gap-2.5">
					<motion.div
						whileHover={{ rotate: 12, scale: 1.05 }}
						transition={{ type: 'spring', stiffness: 400, damping: 15 }}
						className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-primary/30"
						style={{
							backgroundImage:
								'linear-gradient(135deg, var(--primary) 0%, color-mix(in oklab, var(--primary) 60%, white) 100%)',
						}}
					>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
							className="absolute inset-0 bg-gradient-conic from-white/0 via-white/40 to-white/0"
						/>
						<span className="relative text-sm font-extrabold text-primary-foreground">
							M
						</span>
					</motion.div>
					<div className="hidden flex-col leading-tight sm:flex">
						<span className="text-base font-bold tracking-tight">Miks</span>
						<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
							Cooperative banking
						</span>
					</div>
				</Link>

				{/* Desktop nav */}
				<nav className="hidden items-center gap-1 md:flex">
					{navItems.map((link) => {
						const isActive = activeSection === link.href.slice(1)
						return (
							<div
								key={link.key}
								className="relative"
								onMouseEnter={() => setActiveDropdown(link.key)}
								onMouseLeave={() => setActiveDropdown(null)}
							>
								<a
									href={link.href}
									className={cn(
										'relative inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
										isActive
											? 'text-foreground'
											: 'text-muted-foreground hover:text-foreground',
									)}
								>
									{link.label}
									<ChevronDownIcon className="size-3 opacity-50" />
									{isActive && (
										<motion.span
											layoutId="navActiveDot"
											className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary"
											transition={{
												type: 'spring',
												stiffness: 380,
												damping: 30,
											}}
										/>
									)}
								</a>
								<AnimatePresence>
									{activeDropdown === link.key && (
										<motion.div
											initial={{ opacity: 0, y: -4 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -4 }}
											transition={{ duration: 0.15 }}
											className="absolute left-1/2 top-full mt-1 w-56 -translate-x-1/2 rounded-xl border border-border/60 bg-popover p-2 shadow-xl"
										>
											<a
												href={link.href}
												className="block rounded-lg p-3 transition-colors hover:bg-muted"
											>
												<div className="text-sm font-medium">{link.label}</div>
												<div className="text-xs text-muted-foreground">
													{link.description}
												</div>
											</a>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						)
					})}
				</nav>

				<div className="flex items-center gap-2">
					{/* Theme toggle */}
					<button
						type="button"
						onClick={cycleTheme}
						className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						aria-label={`Theme: ${theme} (click to switch)`}
						title={`Theme: ${theme}`}
					>
						<AnimatePresence mode="wait" initial={false}>
							<motion.span
								key={theme}
								initial={{ rotate: -90, opacity: 0 }}
								animate={{ rotate: 0, opacity: 1 }}
								exit={{ rotate: 90, opacity: 0 }}
								transition={{ duration: 0.15 }}
								className="inline-flex"
							>
								<ThemeIcon className="size-4" />
							</motion.span>
						</AnimatePresence>
					</button>

					{/* Language switcher */}
					<div className="hidden items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5 sm:flex">
						<GlobeIcon className="ml-1.5 size-3 text-muted-foreground" />
						{languages.map((lng) => (
							<button
								key={lng}
								type="button"
								onClick={() => setLanguage(lng as SupportedLanguage)}
								className={cn(
									'rounded-full px-2 py-0.5 text-xs font-semibold transition-all',
									language === lng
										? 'bg-foreground text-background shadow-sm'
										: 'text-muted-foreground hover:text-foreground',
								)}
								aria-label={`Switch language to ${lng}`}
								aria-pressed={language === lng}
							>
								{lng.toUpperCase()}
							</button>
						))}
					</div>

					<Link
						to="/auth/login"
						className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
					>
						{t('landing.signIn')}
					</Link>

					<motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
						<Link
							to="/auth/register"
							className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25"
							style={{
								backgroundImage:
									'linear-gradient(135deg, var(--primary) 0%, color-mix(in oklab, var(--primary) 70%, #0AC26A) 100%)',
							}}
						>
							<motion.span
								animate={{ x: ['0%', '100%', '100%'] }}
								transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
								className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
							/>
							<span className="relative">{t('landing.signUp')}</span>
							<svg
								className="relative size-3.5 transition-transform group-hover:translate-x-0.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M5 12h14M13 5l7 7-7 7" />
							</svg>
						</Link>
					</motion.div>

					<button
						type="button"
						onClick={() => setMobileOpen((v) => !v)}
						className="ml-1 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
						aria-label="Toggle menu"
						aria-expanded={mobileOpen}
					>
						<AnimatePresence mode="wait" initial={false}>
							{mobileOpen ? (
								<motion.div
									key="close"
									initial={{ rotate: -90, opacity: 0 }}
									animate={{ rotate: 0, opacity: 1 }}
									exit={{ rotate: 90, opacity: 0 }}
									transition={{ duration: 0.15 }}
								>
									<XIcon className="size-5" />
								</motion.div>
							) : (
								<motion.div
									key="open"
									initial={{ rotate: 90, opacity: 0 }}
									animate={{ rotate: 0, opacity: 1 }}
									exit={{ rotate: -90, opacity: 0 }}
									transition={{ duration: 0.15 }}
								>
									<MenuIcon className="size-5" />
								</motion.div>
							)}
						</AnimatePresence>
					</button>
				</div>
			</div>

			<AnimatePresence>
				{mobileOpen && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.2 }}
						className="overflow-hidden border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden"
					>
						<nav className="space-y-1 px-4 py-4">
							{navItems.map((link) => (
								<a
									key={link.key}
									href={link.href}
									onClick={() => setMobileOpen(false)}
									className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
								>
									{link.label}
								</a>
							))}
							<div className="my-2 h-px bg-border/60" />
							<Link
								to="/auth/login"
								onClick={() => setMobileOpen(false)}
								className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
							>
								{t('landing.signIn')}
							</Link>
							<div className="flex items-center gap-2 px-3 py-2.5">
								{languages.map((lng) => (
									<button
										key={lng}
										type="button"
										onClick={() => setLanguage(lng as SupportedLanguage)}
										className={cn(
											'rounded-full px-3 py-1 text-xs font-semibold transition-all',
											language === lng
												? 'bg-foreground text-background'
												: 'border border-border/60 text-muted-foreground',
										)}
									>
										{lng.toUpperCase()}
									</button>
								))}
							</div>
						</nav>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.header>
	)
}