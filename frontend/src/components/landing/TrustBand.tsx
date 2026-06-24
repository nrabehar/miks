import { Fingerprint, Lock, ScrollText, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const indicators = [
	{ icon: ShieldCheck, key: 'aes' },
	{ icon: Fingerprint, key: 'doubleSignature' },
	{ icon: ScrollText, key: 'audit' },
	{ icon: Lock, key: 'rbac' },
] as const

export const TrustBand = () => {
	const { t } = useTranslation()
	return (
		<section className="bg-primary/5">
			<div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
				<div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
					{indicators.map(({ icon: Icon, key }, i) => (
						<div key={key} className="flex items-center gap-2.5">
							<div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/15">
								<Icon
									style={{ width: 15, height: 15 }}
									className="text-accent"
								/>
							</div>
							<span className="text-sm font-medium text-muted-foreground">
								{t(`landing.trustBand.${key}`)}
							</span>
							{i < indicators.length - 1 && (
								<span className="ml-8 hidden h-4 w-px bg-accent/10 sm:block" />
							)}
						</div>
					))}
				</div>
			</div>
		</section>
	)
}