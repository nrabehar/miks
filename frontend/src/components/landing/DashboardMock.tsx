import { cn } from '#/lib/utils'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, WalletIcon } from 'lucide-react'

/**
 * A small, self-contained mock of the Miks dashboard.
 * Pure decoration — no data, no props except optional className.
 */
export const DashboardMock = ({ className }: { className?: string }) => {
	const balanceBars = [40, 65, 50, 80, 60, 90, 75, 95, 70, 88, 92, 100]

	return (
		<motion.div
			initial={{ opacity: 0, y: 40, rotateX: 8 }}
			animate={{ opacity: 1, y: 0, rotateX: 0 }}
			transition={{ duration: 0.9, delay: 0.6, ease: 'easeOut' }}
			style={{ perspective: 1200 }}
			className={cn('relative mx-auto mt-20 max-w-3xl', className)}
		>
			<motion.div
				whileHover={{ rotateX: 4, rotateY: -4, scale: 1.01 }}
				transition={{ type: 'spring', stiffness: 200, damping: 20 }}
				className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/10"
			>
				{/* Window chrome */}
				<div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
					<div className="flex items-center gap-1.5">
						<span className="size-2.5 rounded-full bg-red-400/70" />
						<span className="size-2.5 rounded-full bg-amber-400/70" />
						<span className="size-2.5 rounded-full bg-emerald-400/70" />
					</div>
					<div className="rounded-md bg-background/50 px-3 py-0.5 text-[10px] font-medium text-muted-foreground">
						app.miks.co / dashboard
					</div>
					<div className="size-4" />
				</div>

				<div className="grid grid-cols-1 gap-0 sm:grid-cols-[180px_1fr]">
					{/* Sidebar */}
					<div className="hidden border-r border-border/60 bg-muted/20 p-3 sm:block">
						<div className="mb-3 flex items-center gap-2">
							<div className="size-6 rounded-md bg-primary" />
							<div className="text-xs font-semibold">Miks</div>
						</div>
						<div className="space-y-1.5">
							{['Dashboard', 'Vaults', 'Members', 'Audit', 'Reports'].map(
								(label, i) => (
									<div
										key={label}
										className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] ${
											i === 0
												? 'bg-primary/10 font-semibold text-primary'
												: 'text-muted-foreground'
										}`}
									>
										<span className="size-1.5 rounded-full bg-current opacity-50" />
										{label}
									</div>
								),
							)}
						</div>
					</div>

					{/* Main content */}
					<div className="p-5">
						{/* Balance header */}
						<div className="mb-4 flex items-start justify-between">
							<div>
								<div className="text-[10px] uppercase tracking-wider text-muted-foreground">
									Total balance
								</div>
								<div className="mt-1 flex items-baseline gap-2">
									<motion.span
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 1.0, duration: 0.5 }}
										className="text-2xl font-bold tracking-tight"
									>
										€48,720
									</motion.span>
									<span className="text-[10px] font-medium text-emerald-600">
										+12.4%
									</span>
								</div>
							</div>
							<div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
								<WalletIcon className="size-4" />
							</div>
						</div>

						{/* Bar chart */}
						<div className="mb-4 flex h-20 items-end gap-1">
							{balanceBars.map((h, i) => (
								<motion.div
									key={i}
									initial={{ scaleY: 0 }}
									animate={{ scaleY: 1 }}
									transition={{
										delay: 1.1 + i * 0.05,
										duration: 0.4,
										ease: 'easeOut',
									}}
									style={{ height: `${h}%`, transformOrigin: 'bottom' }}
									className={`flex-1 rounded-sm ${
										i === balanceBars.length - 1
											? 'bg-primary'
											: 'bg-primary/30'
									}`}
								/>
							))}
						</div>

						{/* Transaction rows */}
						<div className="space-y-1.5">
							{[
								{
									name: 'Aïcha R.',
									label: 'Cotisation — Part sociale',
									amount: '+€120',
									positive: true,
								},
								{
									name: 'Coopérative',
									label: 'Décaissement validé',
									amount: '-€450',
									positive: false,
								},
								{
									name: 'Mohamed K.',
									label: 'Cotisation mensuelle',
									amount: '+€50',
									positive: true,
								},
							].map((tx, i) => (
								<motion.div
									key={tx.name + i}
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 1.6 + i * 0.1, duration: 0.3 }}
									className="flex items-center justify-between rounded-md border border-border/40 bg-background/40 px-2.5 py-1.5"
								>
									<div className="flex items-center gap-2">
										<div
											className={`flex size-6 items-center justify-center rounded-full ${
												tx.positive
													? 'bg-emerald-500/15 text-emerald-600'
													: 'bg-amber-500/15 text-amber-600'
											}`}
										>
											{tx.positive ? (
												<ArrowUpRight className="size-3" />
											) : (
												<ArrowDownRight className="size-3" />
											)}
										</div>
										<div>
											<div className="text-[10px] font-medium leading-tight">
												{tx.name}
											</div>
											<div className="text-[9px] text-muted-foreground">
												{tx.label}
											</div>
										</div>
									</div>
									<div
										className={`text-[11px] font-semibold ${
											tx.positive ? 'text-emerald-600' : 'text-foreground'
										}`}
									>
										{tx.amount}
									</div>
								</motion.div>
							))}
						</div>
					</div>
				</div>
			</motion.div>

			{/* Decorative glow */}
			<div
				className="pointer-events-none absolute inset-x-1/4 -bottom-12 h-24 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
				aria-hidden
			/>
		</motion.div>
	)
}
