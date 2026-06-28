import { cn } from '#/lib/utils/utils'
import { motion } from 'framer-motion'
import {
	ArrowRight,
	ChevronRight,
	type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface Feature {
	icon: LucideIcon
	i18nKey: string
}

interface FeaturesGridProps {
	features: Feature[]
}

/**
 * Bento grid layout for 7 features:
 * Row 1: [card0 lg:col-span-2] [card1 lg:col-span-1]
 * Row 2: [card2] [card3] [card4]
 * Row 3: [card5 lg:col-span-1] [card6 lg:col-span-2]
 * Each row sums to 3 cols → no orphan cards.
 */
const CARD_SPANS = [2, 1, 1, 1, 1, 1, 2] as const

const ICON_COLORS = [
	'bg-primary/12 text-primary',
	'bg-accent/12 text-accent',
	'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
	'bg-primary/12 text-primary',
	'bg-violet-500/12 text-violet-600 dark:text-violet-400',
	'bg-accent/12 text-accent',
	'bg-primary/12 text-primary',
]

export const FeaturesGrid = ({ features }: FeaturesGridProps) => {
	const { t } = useTranslation()
	return (
		<section className="py-24 sm:py-32">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.4 }}
					transition={{ duration: 0.6 }}
					className="mx-auto max-w-2xl text-center"
				>
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
						{t('landing.features.badge')}
					</div>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						{t('landing.features.title')}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						{t('landing.features.subtitle')}
					</p>
				</motion.div>

				{/* Bento grid — 3 cols on lg, 2 on sm, 1 on mobile */}
				<div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{features.map((feature, i) => {
						const span = CARD_SPANS[i] ?? 1
						const isFeatured = span === 2
						return (
							<motion.div
								key={feature.i18nKey}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, amount: 0.25 }}
								transition={{ duration: 0.45, delay: (i % 3) * 0.07 }}
								whileHover={{ y: -3 }}
								className={cn(
									'group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-lg',
									isFeatured
										? 'hover:border-primary/40 hover:shadow-primary/6 sm:col-span-2 lg:col-span-2'
										: 'hover:border-border/80',
								)}
							>
								{/* Gradient overlay on hover */}
								<div
									className={cn(
										'pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100',
										isFeatured
											? 'bg-linear-to-br from-primary/6 to-primary/12'
											: 'bg-linear-to-br from-muted/60 to-muted/20',
									)}
								/>

								<div
									className={cn(
										'mb-4 inline-flex items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110',
										isFeatured ? 'size-14' : 'size-12',
										ICON_COLORS[i] ?? ICON_COLORS[0],
									)}
								>
									<feature.icon className={cn(isFeatured ? 'size-7' : 'size-6')} />
								</div>

								<h3
									className={cn(
										'font-semibold text-foreground',
										isFeatured ? 'text-xl' : 'text-lg',
									)}
								>
									{t(`landing.features.items.${feature.i18nKey}.title`)}
								</h3>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
									{t(`landing.features.items.${feature.i18nKey}.description`)}
								</p>
								<div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
									{t('landing.features.learnMore')}
									<ArrowRight className="size-3" />
								</div>
							</motion.div>
						)
					})}
				</div>
			</div>
		</section>
	)
}

interface Step {
	i18nKey: string
}

interface HowItWorksProps {
	steps: Step[]
}

export const HowItWorks = ({ steps }: HowItWorksProps) => {
	const { t } = useTranslation()
	return (
		<section id="how" className="bg-muted/30 py-24 sm:py-32">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.4 }}
					transition={{ duration: 0.6 }}
					className="mx-auto max-w-2xl text-center"
				>
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/8 px-3 py-1 text-xs font-semibold text-accent">
						{t('landing.howItWorks.badge')}
					</div>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						{t('landing.howItWorks.title')}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						{t('landing.howItWorks.subtitle')}
					</p>
				</motion.div>

				<div className="mt-16 grid gap-8 md:grid-cols-3">
					{steps.map((step, i) => (
						<motion.div
							key={step.i18nKey}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, amount: 0.4 }}
							transition={{ duration: 0.5, delay: i * 0.15 }}
							className="relative"
						>
							<div className="flex items-start gap-4">
								<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/30">
									{i + 1}
								</div>
								<div className="pt-1">
									<h3 className="text-lg font-semibold">
										{t(`landing.howItWorks.steps.${step.i18nKey}.title`)}
									</h3>
									<p className="mt-2 text-sm text-muted-foreground">
										{t(`landing.howItWorks.steps.${step.i18nKey}.description`)}
									</p>
								</div>
							</div>
							{i < steps.length - 1 && (
								<ChevronRight className="absolute -right-3 top-2 hidden size-6 text-muted-foreground/30 md:block" />
							)}
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}
