import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const HeroSection = () => {
	const { t } = useTranslation()
	return (
		<section className="relative overflow-hidden pt-16 pb-12 lg:min-h-screen lg:flex lg:items-center">
			{/* Background gradient mesh */}
			<div
				className="absolute inset-0 -z-20"
				style={{
					backgroundImage:
						'radial-gradient(at 15% 25%, rgba(10,194,106,0.12) 0px, transparent 55%), radial-gradient(at 85% 10%, rgba(19,27,77,0.08) 0px, transparent 50%), radial-gradient(at 95% 55%, rgba(10,194,106,0.07) 0px, transparent 50%)',
				}}
			/>
			{/* Grid pattern */}
			<div
				className="absolute inset-0 -z-10 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
				style={{
					backgroundImage:
						'linear-gradient(rgba(19,27,77,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(19,27,77,0.06) 1px, transparent 1px)',
					backgroundSize: '56px 56px',
				}}
			/>

			{/* Blobs — CSS animation (GPU-composited, no JS overhead) */}
			<div className="animate-blob-up absolute right-8 top-28 -z-10 size-80 rounded-full bg-primary/15 blur-3xl" />
			<div className="animate-blob-down absolute -left-16 bottom-16 -z-10 size-72 rounded-full bg-accent/8 blur-3xl" />

			{/* Two-column layout */}
			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 lg:py-8 flex flex-col items-center gap-10 text-center">
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.45 }}
						className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur"
					>
						<Sparkles className="size-3.5" />
						{t('landing.hero.badge')}
					</motion.div>

					<motion.h1
						initial={{ opacity: 0, y: 24 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.55, delay: 0.08 }}
						className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
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
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="mt-6 leading-relaxed text-muted-foreground sm:text-xl max-w-lg"
					>
						{t('landing.hero.subtitle')}
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.32 }}
						className="mt-8 flex flex-wrap items-center gap-3"
					>
						<Link
							to="/auth/register"
							className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 active:scale-100"
						>
							{t('landing.hero.cta')}
							<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
						</Link>
						<a
							href="#features"
							className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-5 py-3.5 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-muted"
						>
							<Shield className="size-4 text-primary" />
							{t('landing.hero.ctaSecondary')}
						</a>
					</motion.div>

					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.6, delay: 0.5 }}
						className="mt-5 text-xs text-muted-foreground"
					>
						{t('landing.hero.trustLine')}
					</motion.p>
			</div>

			<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background" />
		</section>
	)
}
