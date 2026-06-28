import { motion } from 'framer-motion'
import { CheckIcon, SparklesIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

interface Plan {
	i18nKey: string
	featured?: boolean
	features: string[]
}

interface PricingSectionProps {
	plans: Plan[]
}

export const PricingSection = ({ plans }: PricingSectionProps) => {
	const { t } = useTranslation()
	const [yearly, setYearly] = useState(true)

	return (
		<section id="pricing" className="border-y border-border/50 bg-muted/50 py-16 sm:py-20">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.4 }}
					transition={{ duration: 0.6 }}
					className="mx-auto max-w-2xl text-center"
				>
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
						<SparklesIcon className="size-3" />
						{t('landing.pricing.badge')}
					</div>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						{t('landing.pricing.title')}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						{t('landing.pricing.subtitle')}
					</p>

					{/* Billing toggle */}
					<div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background p-1">
						<button
							type="button"
							onClick={() => setYearly(false)}
							className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
								!yearly ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground'
							}`}
						>
							{t('landing.pricing.monthly')}
						</button>
						<button
							type="button"
							onClick={() => setYearly(true)}
							className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
								yearly ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground'
							}`}
						>
							{t('landing.pricing.yearly')}
							<span className="ml-1 inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
								-20%
							</span>
						</button>
					</div>
				</motion.div>

				<div className="mt-16 grid gap-8 lg:grid-cols-3">
					{plans.map((plan, i) => (
						<motion.div
							key={plan.i18nKey}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, amount: 0.3 }}
							transition={{ duration: 0.5, delay: i * 0.1 }}
							className={`relative rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-xl ${
								plan.featured
									? 'border-primary shadow-lg shadow-primary/10'
									: 'border-border/60'
							}`}
						>
							{plan.featured && (
								<div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
									{t('landing.pricing.popular')}
								</div>
							)}
							<h3 className="text-lg font-semibold">
								{t(`landing.pricing.plans.${plan.i18nKey}.name`)}
							</h3>
							<p className="mt-2 text-sm text-muted-foreground">
								{t(`landing.pricing.plans.${plan.i18nKey}.tagline`)}
							</p>
							<div className="mt-6">
								<span className="text-4xl font-bold">
									{t(`landing.pricing.plans.${plan.i18nKey}.price`)}
								</span>
								<span className="ml-1 text-sm text-muted-foreground">
									{t(`landing.pricing.plans.${plan.i18nKey}.period`)}
								</span>
							</div>
							<ul className="mt-6 space-y-3">
								{plan.features.map((featureKey) => (
									<li key={featureKey} className="flex items-start gap-2 text-sm">
										<CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
										<span className="text-muted-foreground">{t(`landing.pricing.features.${featureKey}`)}</span>
									</li>
								))}
							</ul>
							<Link
								to="/auth/register"
								className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all ${
									plan.featured
										? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40'
										: 'border border-border/60 bg-background hover:bg-muted'
								}`}
							>
								{t(`landing.pricing.plans.${plan.i18nKey}.cta`)}
							</Link>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}