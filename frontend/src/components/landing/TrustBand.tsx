import { Fingerprint, Lock, ScrollText, ShieldCheck } from 'lucide-react'

const indicators = [
	{ icon: ShieldCheck, label: 'AES-256' },
	{ icon: Fingerprint, label: 'Double-Signature' },
	{ icon: ScrollText, label: 'Audit immuable' },
	{ icon: Lock, label: 'Accès par rôle' },
]

export const TrustBand = () => {
	return (
		<section className="bg-primary/5">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
				<div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
					{indicators.map(({ icon: Icon, label }, i) => (
						<div key={label} className="flex items-center gap-2.5">
							<div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
								<Icon
									style={{ width: 15, height: 15 }}
									className="text-accent"
								/>
							</div>
							<span className="text-sm font-medium text-muted-foreground">
								{label}
							</span>
							{i < indicators.length - 1 && (
								<span className="ml-8 hidden sm:block w-px h-4 bg-accent/10" />
							)}
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
