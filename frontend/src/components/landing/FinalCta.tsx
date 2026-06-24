import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface FinalCtaProps {
	ctaTo: string
}

export const FinalCta = ({ ctaTo }: FinalCtaProps) => {
	const { t } = useTranslation()
	return (
		<section className="relative overflow-hidden py-24 sm:py-32">
			<div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
			<div
				className="absolute inset-0 -z-10 opacity-30"
				style={{
					backgroundImage:
						'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
				}}
			/>
			<motion.div
				animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
				transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
				className="absolute -right-20 -top-20 -z-10 size-80 rounded-full bg-white/10 blur-3xl"
			/>

			<div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.5 }}
					transition={{ duration: 0.6 }}
				>
					<Sparkles className="mx-auto size-10 text-white/80" />
					<h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-5xl">
						{t('landing.finalCta.title')}
					</h2>
					<p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
						{t('landing.finalCta.description')}
					</p>
					<div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Link
							to={ctaTo}
							className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-primary shadow-2xl shadow-black/20 transition-all hover:scale-105 hover:shadow-3xl active:scale-100"
						>
							{t('landing.finalCta.cta')}
							<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
						</Link>
					</div>
					<p className="mt-6 text-sm text-white/70">
						{t('landing.finalCta.trustLine')}
					</p>
				</motion.div>
			</div>
		</section>
	)
}