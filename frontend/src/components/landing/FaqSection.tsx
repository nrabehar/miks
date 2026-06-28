import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDownIcon, HelpCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface FaqItem {
	i18nKey: string
}

interface FaqSectionProps {
	items: FaqItem[]
}

export const FaqSection = ({ items }: FaqSectionProps) => {
	const { t } = useTranslation()
	const [openIndex, setOpenIndex] = useState<number | null>(0)

	return (
		<section id="faq" className="py-16 sm:py-20">
			<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, amount: 0.4 }}
					transition={{ duration: 0.6 }}
					className="text-center"
				>
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
						<HelpCircleIcon className="size-3" />
						{t('landing.faq.badge')}
					</div>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						{t('landing.faq.title')}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						{t('landing.faq.subtitle')}
					</p>
				</motion.div>

				<div className="mt-12 space-y-3">
					{items.map((item, i) => {
						const open = openIndex === i
						return (
							<motion.div
								key={item.i18nKey}
								initial={{ opacity: 0, y: 10 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, amount: 0.3 }}
								transition={{ duration: 0.4, delay: i * 0.05 }}
								className="overflow-hidden rounded-xl border border-border/60 bg-card transition-shadow hover:shadow-md"
							>
								<button
									type="button"
									onClick={() => setOpenIndex(open ? null : i)}
									className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
									aria-expanded={open}
								>
									<span className="text-sm font-semibold sm:text-base">
										{t(`landing.faq.items.${item.i18nKey}.question`)}
									</span>
									<motion.div
										animate={{ rotate: open ? 180 : 0 }}
										transition={{ duration: 0.2 }}
										className="shrink-0"
									>
										<ChevronDownIcon className="size-4 text-muted-foreground" />
									</motion.div>
								</button>
								<AnimatePresence initial={false}>
									{open && (
										<motion.div
											key="content"
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: 'auto', opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.25, ease: 'easeOut' }}
											className="overflow-hidden"
										>
											<p className="border-t border-border/40 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
												{t(`landing.faq.items.${item.i18nKey}.answer`)}
											</p>
										</motion.div>
									)}
								</AnimatePresence>
							</motion.div>
						)
					})}
				</div>
			</div>
		</section>
	)
}