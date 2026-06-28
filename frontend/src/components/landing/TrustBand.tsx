import { Fingerprint, Lock, ScrollText, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const indicators = [
	{ icon: ShieldCheck, key: 'aes', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
	{ icon: Fingerprint, key: 'doubleSignature', color: 'text-primary bg-primary/10' },
	{ icon: ScrollText, key: 'audit', color: 'text-accent bg-accent/10' },
	{ icon: Lock, key: 'rbac', color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10' },
] as const

export const TrustBand = () => {
	const { t } = useTranslation()
	return (
		<section className="border-y border-border/50 bg-muted/20 py-4">
			<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
				<div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
					{indicators.map(({ icon: Icon, key, color }, i) => (
						<div key={key} className="flex items-center gap-2.5">
							<div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${color}`}>
								<Icon style={{ width: 14, height: 14 }} />
							</div>
							<span className="text-sm font-medium text-foreground/70">
								{t(`landing.trustBand.${key}`)}
							</span>
							{i < indicators.length - 1 && (
								<span className="ml-6 hidden h-3.5 w-px bg-border/60 sm:block" />
							)}
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
