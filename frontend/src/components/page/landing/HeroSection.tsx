import { Link } from '@tanstack/react-router'
import { ArrowRight, Shield } from 'lucide-react'

export const HeroSection = () => {
	return (
		<section className="relative min-h-screen flex items-center overflow-hidden pt-16">
			{/* Subtle background grid */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					backgroundImage:
						'linear-gradient(rgba(19,27,77,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(19,27,77,0.06) 1px, transparent 1px)',
					backgroundSize: '48px 48px',
				}}
			/>
			{/* Ambient glow top-right */}
			<div
				className="absolute top-0 right-0 w-150 h-150 rounded-full pointer-events-none"
				style={{
					background:
						'radial-gradient(circle, rgba(10,194,106,0.07) 0%, transparent 70%)',
				}}
			/>
			<div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
				{/* H1 */}
				<h1 className="text-[2.6rem] sm:text-5xl lg:text-[3.75rem] font-bold leading-[1.1] tracking-tight mb-5">
					Investissez à plusieurs, <br className="hidden sm:block" />
					<span className="text-primary">en toute transparence.</span>
				</h1>

				{/* Subtitle */}
				<p className="max-w-xl mx-auto text-lg text-muted-foreground leading-relaxed mb-8">
					Centralisez la caisse de votre groupe. Automatisez les
					cotisations, sécurisez les décaissements, calculez les parts
					en temps réel.
				</p>

				{/* CTA */}
				<div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
					<Link
						to="/"
						className="inline-flex items-center gap-2.5 bg-primary text-primary-foreground px-7 py-3.5 rounded-xl transition-all shadow-[0_4px_16px_primary] hover:shadow-[0_6px_24px_primary] hover:-translate-y-0.5 font-medium w-full sm:w-auto justify-center"
					>
						Créer un Workspace
						<ArrowRight
							className="w-4.5 h-4.5"
							style={{ width: 18, height: 18 }}
						/>
					</Link>
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-3.5"
					>
						<Shield className="w-4 h-4" />
						Voir l'architecture de sécurité
					</Link>
				</div>
				<p className="text-xs text-[#9CA3AF] mb-14">
					Gratuit · Aucune carte requise · Prêt en 5 min
				</p>
			</div>
		</section>
	)
}
