import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const HeroSection = () => {
	const { t } = useTranslation()
	return (
		<section className="relative flex min-h-screen items-center overflow-hidden pt-20">
			{/* Background gradient mesh */}
			<div
				className="absolute inset-0 -z-20"
				style={{
					backgroundImage:
						'radial-gradient(at 20% 20%, rgba(10,194,106,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(19,27,77,0.1) 0px, transparent 50%), radial-gradient(at 100% 50%, rgba(10,194,106,0.08) 0px, transparent 50%)',
				}}
			/>
			{/* Grid pattern */}
			<div
				className="absolute inset-0 -z-10 opacity-[0.4] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
				style={{
					backgroundImage:
						'linear-gradient(rgba(19,27,77,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(19,27,77,0.06) 1px, transparent 1px)',
					backgroundSize: '56px 56px',
				}}
			/>
			{/* Floating orbs */}
			<motion.div
				animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }}
				transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
				className="absolute right-10 top-32 -z-10 size-72 rounded-full bg-primary/20 blur-3xl"
			/>
			<motion.div
				animate={{ y: [0, 30, 0], scale: [1, 1.15, 1] }}
				transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
				className="absolute -left-20 bottom-20 -z-10 size-80 rounded-full bg-primary/15 blur-3xl"
			/>

			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-3xl text-center">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur"
					>
						<Sparkles className="size-3.5" />
						{t('landing.hero.badge')}
					</motion.div>

					<motion.h1
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.1 }}
						className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
					>
						{t('landing.hero.title1')}{' '}
						<span className="relative inline-block text-primary">
							{t('landing.hero.title2')}
							<motion.svg
								viewBox="0 0 300 12"
								fill="none"
								className="absolute -bottom-2 left-0 w-full"
							>
								<motion.path
									d="M2 9c60-7 120-7 180-3s60 4 116 0"
									stroke="currentColor"
									strokeWidth="3"
									strokeLinecap="round"
									initial={{ pathLength: 0 }}
									animate={{ pathLength: 1 }}
									transition={{ duration: 1.2, delay: 0.8 }}
								/>
							</motion.svg>
						</span>
					</motion.h1>

					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.25 }}
						className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
					>
						{t('landing.hero.subtitle')}
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.4 }}
						className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
					>
						<Link
							to="/auth/register"
							className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-7 py-3.5 font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 active:scale-100"
						>
							{t('landing.hero.cta')}
							<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
						</Link>
						<a
							href="#features"
							className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-5 py-3.5 text-sm text-foreground backdrop-blur transition-colors hover:bg-muted"
						>
							<Shield className="size-4 text-primary" />
							{t('landing.hero.ctaSecondary')}
						</a>
					</motion.div>

					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.6, delay: 0.6 }}
						className="mt-5 text-xs text-muted-foreground"
					>
						{t('landing.hero.trustLine')}
					</motion.p>
				</div>
			</div>

			<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background" />
		</section>
	)
}