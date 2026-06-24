import { motion } from 'framer-motion'
import {
	ArrowRight,
	ChevronRight,
	type LucideIcon,
} from 'lucide-react'

export interface Feature {
	icon: LucideIcon
	title: string
	description: string
}

interface FeaturesGridProps {
	features: Feature[]
}

export const FeaturesGrid = ({ features }: FeaturesGridProps) => {
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
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
						Features
					</div>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						Tout ce qu'il faut pour gérer une coopérative
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						Des outils pensés pour les groupes informels : simples à prendre
						en main, rigoureux sur la sécurité.
					</p>
				</motion.div>

				<div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{features.map((feature, i) => (
						<motion.div
							key={feature.title}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, amount: 0.3 }}
							transition={{ duration: 0.5, delay: i * 0.08 }}
							whileHover={{ y: -4 }}
							className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
						>
							<div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100 group-hover:from-primary/5 group-hover:to-primary/10" />
							<div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
								<feature.icon className="size-6" />
							</div>
							<h3 className="text-lg font-semibold text-foreground">
								{feature.title}
							</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								{feature.description}
							</p>
							<div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
								En savoir plus
								<ArrowRight className="size-3" />
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}

interface HowItWorksProps {
	steps: { title: string; description: string }[]
}

export const HowItWorks = ({ steps }: HowItWorksProps) => {
	return (
		<section className="bg-muted/30 py-24 sm:py-32">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.4 }}
					transition={{ duration: 0.6 }}
					className="mx-auto max-w-2xl text-center"
				>
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
						Comment ça marche
					</div>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						Opérationnel en 5 minutes
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						Trois étapes, zéro paperasse, zéro formation.
					</p>
				</motion.div>

				<div className="mt-16 grid gap-8 md:grid-cols-3">
					{steps.map((step, i) => (
						<motion.div
							key={step.title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, amount: 0.4 }}
							transition={{ duration: 0.5, delay: i * 0.15 }}
							className="relative"
						>
							<div className="flex items-start gap-4">
								<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30">
									{i + 1}
								</div>
								<div className="pt-1">
									<h3 className="text-lg font-semibold">{step.title}</h3>
									<p className="mt-2 text-sm text-muted-foreground">
										{step.description}
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