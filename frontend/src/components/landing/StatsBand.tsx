import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface Stat {
	value: string
	labelKey: string
}

interface StatsBandProps {
	stats: Stat[]
}

export const StatsBand = ({ stats }: StatsBandProps) => {
	const { t } = useTranslation()
	return (
		<section className="border-y border-border/40 bg-muted/30 py-12">
			<div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:px-6 lg:px-8 md:grid-cols-4">
				{stats.map((stat, i) => (
					<motion.div
						key={stat.labelKey}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, amount: 0.6 }}
						transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
						className="text-center"
					>
						<div className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
							{stat.value}
						</div>
						<div className="mt-1 text-sm text-muted-foreground">
							{t(stat.labelKey)}
						</div>
					</motion.div>
				))}
			</div>
		</section>
	)
}