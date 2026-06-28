import { type SupportedLanguage } from '#/i18n/config'
import { useLanguage } from '#/i18n/useLanguage'
import { MiksLogo } from '@/components/brand/logo'
import { useActiveSection } from '@/hook/useActiveSection'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/theme.store'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
	GlobeIcon,
	LogInIcon,
	MenuIcon,
	MonitorIcon,
	MoonIcon,
	SparklesIcon,
	SunIcon,
	XIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface NavLink {
	key: string
	href: string
}

const NAV_LINK_KEYS: readonly NavLink[] = [
	{ key: 'product', href: '#features' },
	{ key: 'process', href: '#how' },
	{ key: 'security', href: '#security' },
	{ key: 'pricing', href: '#pricing' },
	{ key: 'faq', href: '#faq' },
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
		<>
			<motion.header
				initial={false}
				animate={{
					width: scrolled ? 'min(920px, calc(100% - 32px))' : 'min(1100px, calc(100% - 16px))',
					y: scrolled ? 6 : 10,
				}}
				transition={{ type: 'spring', stiffness: 300, damping: 35 }}
				className="fixed left-1/2 top-0 z-50 -translate-x-1/2"
			>
				<motion.div
					animate={{
						boxShadow: scrolled
							? '0 8px 30px -8px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)'
							: '0 4px 20px -8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
					}}
					transition={{ duration: 0.2 }}
					className={cn(
						'grid h-12 grid-cols-[auto_1fr_auto] items-center gap-2 rounded-full border border-border/40 px-2 backdrop-blur-2xl backdrop-saturate-150 transition-colors',
						scrolled ? 'bg-background/85' : 'bg-background/65',
					)}
				>
					{/* Logo */}
					<Link
						to="/"
						className="flex shrink-0 items-center gap-2 rounded-full pl-1.5 pr-3 transition-opacity hover:opacity-80"
					>
						<motion.div
							whileHover={{ rotate: 8, scale: 1.05 }}
							transition={{ type: 'spring', stiffness: 400, damping: 15 }}
							className="flex size-8 items-center justify-center"
						>
							<MiksLogo className="h-7 w-auto" />
						</motion.div>
						<span className="hidden text-sm font-semibold tracking-tight sm:inline">
							Miks
						</span>
					</Link>

					{/* Centered nav (desktop) — flex-1 column so it never overlaps logo or actions */}
					<nav className="hidden min-w-0 items-center justify-center gap-0.5 overflow-hidden md:flex">
						{navItems.map((link) => {
							const isActive = activeSection === link.href.slice(1)
							return (
								<a
									key={link.key}
									href={link.href}
									aria-current={isActive ? 'true' : undefined}
									className={cn(
										'relative rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
										isActive
											? 'text-foreground'
											: 'text-muted-foreground hover:text-foreground',
									)}
								>
									{isActive && (
										<motion.span
											layoutId="navActivePill"
											className="absolute inset-0 -z-10 rounded-full bg-muted"
											transition={{
												type: 'spring',
												stiffness: 380,
												damping: 32,
											}}
										/>
									)}
									{link.label}
								</a>
							)
						})}
					</nav>

					{/* Right actions */}
					<div className="flex shrink-0 items-center gap-1 pr-2">
						<div className="hidden items-center gap-0.5 rounded-full p-0.5 sm:flex">
							<GlobeIcon className="ml-1 size-3.5 text-muted-foreground" />
							{languages.map((lng) => (
								<button
									key={lng}
									type="button"
									onClick={() => setLanguage(lng as SupportedLanguage)}
									className={cn(
										'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-all',
										language === lng
											? 'bg-foreground text-background shadow-sm'
											: 'text-muted-foreground hover:text-foreground',
									)}
									aria-label={`Switch language to ${lng}`}
									aria-pressed={language === lng}
								>
									{lng}
								</button>
							))}
						</div>

						<button
							type="button"
							onClick={cycleTheme}
							className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

						<Link
							to="/auth/login"
							className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:inline-flex"
						>
							<LogInIcon className="size-3.5" />
							{t('landing.signIn')}
						</Link>

						<motion.div
							whileHover={{ scale: 1.04 }}
							whileTap={{ scale: 0.97 }}
						>
							<Link
								to="/auth/register"
								className="group relative inline-flex items-center gap-1 overflow-hidden rounded-full bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-shadow hover:shadow-lg hover:shadow-primary/35 sm:px-4"
							>
								<SparklesIcon className="size-3 sm:hidden" />
								<span className="relative whitespace-nowrap">
									{t('landing.signUp')}
								</span>
								<svg
									className="hidden size-3 transition-transform group-hover:translate-x-0.5 sm:block"
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
							className="ml-0.5 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
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
										<XIcon className="size-4" />
									</motion.div>
								) : (
									<motion.div
										key="open"
										initial={{ rotate: 90, opacity: 0 }}
										animate={{ rotate: 0, opacity: 1 }}
										exit={{ rotate: -90, opacity: 0 }}
										transition={{ duration: 0.15 }}
									>
										<MenuIcon className="size-4" />
									</motion.div>
								)}
							</AnimatePresence>
						</button>
					</div>
				</motion.div>
			</motion.header>

			<AnimatePresence>
				{mobileOpen && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.18 }}
						className="fixed left-1/2 top-16 z-40 w-[min(360px,calc(100%-32px))] -translate-x-1/2 rounded-2xl border border-border/40 bg-background/95 p-2 shadow-2xl backdrop-blur-2xl md:hidden"
					>
						<nav className="space-y-0.5">
							{navItems.map((link) => {
								const isActive = activeSection === link.href.slice(1)
								return (
									<a
										key={link.key}
										href={link.href}
										onClick={() => setMobileOpen(false)}
										className={cn(
											'block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
											isActive
												? 'bg-muted text-foreground'
												: 'text-foreground/80 hover:bg-muted',
										)}
									>
										{link.label}
									</a>
								)
							})}
						</nav>
						<div className="my-2 h-px bg-border/40" />
						<div className="flex flex-col gap-1.5 px-1 pb-1">
							<Link
								to="/auth/login"
								onClick={() => setMobileOpen(false)}
								className="block rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted active:scale-95 transition-all"
							>
								{t('landing.signIn')}
							</Link>
							<Link
								to="/auth/register"
								onClick={() => setMobileOpen(false)}
								className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
							>
								<SparklesIcon className="size-3.5" />
								{t('landing.signUp')}
							</Link>
						</div>
						<div className="my-2 h-px bg-border/40" />
						<div className="flex items-center gap-2 px-3 py-2">
							{languages.map((lng) => (
								<button
									key={lng}
									type="button"
									onClick={() => setLanguage(lng as SupportedLanguage)}
									className={cn(
										'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all',
										language === lng
											? 'bg-foreground text-background'
											: 'border border-border/40 text-muted-foreground',
									)}
								>
									{lng}
								</button>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	)
}
