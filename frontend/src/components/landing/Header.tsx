import { type SupportedLanguage } from '#/i18n/config'
import { useLanguage } from '#/i18n/useLanguage'
import { cn } from '@/lib/utils'
import { GlobeIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Header = () => {
	const { language, setLanguage, languages } = useLanguage()
	const { t } = useTranslation()

	return (
		<header className="fixed w-full top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
				{/* Logo */}
				<Link to="/" className="flex items-center gap-2 shrink-0">
					<div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
						<span className="text-sm font-bold">M</span>
					</div>
					<span className="hidden text-lg font-bold tracking-tight sm:inline">Miks</span>
				</Link>

				{/* Center nav (desktop) */}
				<nav className="hidden md:flex items-center gap-1">
					<a
						href="#features"
						className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						Features
					</a>
					<a
						href="#pricing"
						className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						Pricing
					</a>
					<a
						href="#about"
						className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						About
					</a>
				</nav>

				{/* Right side */}
				<div className="flex items-center gap-2">
					{/* Language switcher */}
					<div className="hidden items-center rounded-full border border-border/60 bg-background/60 p-0.5 sm:flex">
						<GlobeIcon className="ml-2 size-3.5 text-muted-foreground" />
						{languages.map((lng) => (
							<button
								key={lng}
								type="button"
								onClick={() => setLanguage(lng as SupportedLanguage)}
								className={cn(
									'rounded-full px-2.5 py-1 text-xs font-medium transition-all',
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

					{/* Mobile language switcher (compact) */}
					<div className="flex items-center gap-0.5 sm:hidden">
						{languages.map((lng) => (
							<button
								key={lng}
								type="button"
								onClick={() => setLanguage(lng as SupportedLanguage)}
								className={cn(
									'rounded px-1.5 py-0.5 text-xs font-medium',
									language === lng
										? 'bg-foreground text-background'
										: 'text-muted-foreground',
								)}
							>
								{lng.toUpperCase()}
							</button>
						))}
					</div>

					{/* Auth buttons */}
					<Link
						to="/auth/login"
						className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
					>
						{t('auth.login.title')}
					</Link>
					<Link
						to="/auth/register"
						className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
					>
						<span className="hidden sm:inline">{t('auth.register.title')}</span>
						<span className="sm:hidden">Sign up</span>
						<svg
							className="size-3.5"
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
				</div>
			</div>
		</header>
	)
}
