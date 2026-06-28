import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface Testimonial {
	quoteKey: string
	author: string
	role: string
	initial: string
}

interface TestimonialsBandProps {
	testimonials: Testimonial[]
}

export const TestimonialsBand = ({ testimonials }: TestimonialsBandProps) => {
	const { t } = useTranslation()
	return (
		<section className="border-y border-border/50 bg-muted/50 py-16 sm:py-20">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.4 }}
					transition={{ duration: 0.6 }}
					className="mx-auto max-w-2xl text-center"
				>
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
						{t('landing.testimonials.badge')}
					</div>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						{t('landing.testimonials.title')}
					</h2>
				</motion.div>

				<div className="mt-16 grid gap-6 md:grid-cols-3">
					{testimonials.map((tm, i) => (
						<motion.figure
							key={tm.author}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, amount: 0.4 }}
							transition={{ duration: 0.5, delay: i * 0.1 }}
							className="flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
						>
							<svg
								className="mb-4 size-8 text-primary/40"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
							</svg>
							<blockquote className="flex-1 text-sm leading-relaxed text-foreground">
								{t(tm.quoteKey)}
							</blockquote>
							<figcaption className="mt-6 flex items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 font-semibold text-primary-foreground">
									{tm.initial}
								</div>
								<div>
									<div className="text-sm font-semibold">{tm.author}</div>
									<div className="text-xs text-muted-foreground">{tm.role}</div>
								</div>
							</figcaption>
						</motion.figure>
					))}
				</div>
			</div>
		</section>
	)
}