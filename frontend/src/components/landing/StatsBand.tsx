import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface Stat {
	value: string
	labelKey: string
}

interface StatsBandProps {
	stats: Stat[]
}

const COLORS = [
	{ value: 'text-primary', bg: 'bg-primary/8' },
	{ value: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/8' },
	{ value: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/8' },
	{ value: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/8' },
]

export const StatsBand = ({ stats }: StatsBandProps) => {
	const { t } = useTranslation()
	return (
		<section className="border-y border-border/50">
			<div className="mx-auto grid max-w-6xl grid-cols-2 gap-0 px-4 sm:px-6 lg:px-8 md:grid-cols-4">
				{stats.map((stat, i) => {
					const color = COLORS[i % COLORS.length]!
					return (
						<motion.div
							key={stat.labelKey}
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, amount: 0.6 }}
							transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}
							className={`flex flex-col items-center gap-2 px-4 py-10 text-center ${
								i < stats.length - 1
									? 'border-r-0 md:border-r md:border-border/50'
									: ''
							} ${i < 2 ? 'border-b md:border-b-0 border-border/50' : ''}`}
						>
							<div className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-3xl font-black tracking-tight sm:text-4xl tabular-nums ${color.value} ${color.bg}`}>
								{stat.value}
							</div>
							<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								{t(stat.labelKey)}
							</div>
						</motion.div>
					)
				})}
			</div>
		</section>
	)
}
