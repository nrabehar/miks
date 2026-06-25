import { motion } from 'framer-motion'
import {
	DatabaseIcon,
	FileLockIcon,
	ServerIcon,
	ShieldCheckIcon,
	UsersIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SecurityItem {
	i18nKey: string
	icon: typeof ShieldCheckIcon
}

const securityItems: SecurityItem[] = [
	{ i18nKey: 'doubleSignature', icon: ShieldCheckIcon },
	{ i18nKey: 'encryption', icon: FileLockIcon },
	{ i18nKey: 'euHosting', icon: ServerIcon },
	{ i18nKey: 'dataIsolation', icon: DatabaseIcon },
	{ i18nKey: 'roles', icon: UsersIcon },
]

export const SecuritySection = () => {
	const { t } = useTranslation()
	return (
		<section id="security" className="py-24 sm:py-32">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.4 }}
					transition={{ duration: 0.6 }}
					className="mx-auto max-w-2xl text-center"
				>
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
						<ShieldCheckIcon className="size-3" />
						{t('landing.security.badge')}
					</div>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						{t('landing.security.title')}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						{t('landing.security.subtitle')}
					</p>
				</motion.div>

				<div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{securityItems.map((item, i) => (
						<motion.div
							key={item.i18nKey}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, amount: 0.3 }}
							transition={{ duration: 0.5, delay: i * 0.08 }}
							className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
						>
							<div className="absolute -right-12 -top-12 size-32 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100" />
							<div className="relative">
								<div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<item.icon className="size-6" />
								</div>
								<h3 className="text-lg font-semibold text-foreground">
									{t(`landing.security.items.${item.i18nKey}.title`)}
								</h3>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
									{t(`landing.security.items.${item.i18nKey}.description`)}
								</p>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	)
}