import { Header } from '#/components/landing/Header'
import { HeroSection } from '#/components/landing/HeroSection'
import { TrustBand } from '#/components/landing/TrustBand'
import { StatsBand } from '#/components/landing/StatsBand'
import {
	FeaturesGrid,
	HowItWorks,
} from '#/components/landing/FeaturesGrid'
import { TestimonialsBand } from '#/components/landing/TestimonialsBand'
import { FinalCta } from '#/components/landing/FinalCta'
import { createFileRoute } from '@tanstack/react-router'
import {
	BarChart3Icon,
	FolderLockIcon,
	LineChartIcon,
	PiggyBankIcon,
	ShieldCheckIcon,
	UsersIcon,
	WalletIcon,
	type LucideIcon,
} from 'lucide-react'

export const Route = createFileRoute('/')({
	staticData: { title: 'Cooperative banking infrastructure' },
	component: Home,
})

interface Feature {
	icon: LucideIcon
	title: string
	description: string
}

const features: Feature[] = [
	{
		icon: PiggyBankIcon,
		title: 'Cotisations automatiques',
		description:
			'Définissez les règles une fois : Miks prélève, ventile et calcule les parts. Plus jamais de calcul à la main.',
	},
	{
		icon: WalletIcon,
		title: 'Coffres Multiples',
		description:
			'Liquidité, Investissement, Sécurité. Chaque euro sait où il doit aller — et Miks le vérifie.',
	},
	{
		icon: ShieldCheckIcon,
		title: 'Double signature',
		description:
			'Aucun mouvement financier sans validation à deux. Par email, code OTP, ou les deux.',
	},
	{
		icon: LineChartIcon,
		title: 'Parts en temps réel',
		description:
			'Le tableau de bord affiche la part exacte de chaque membre à chaque seconde.',
	},
	{
		icon: FolderLockIcon,
		title: 'Audit immuable',
		description:
			'Chaque action est journalisée, horodatée, signée. Aucun administrateur ne peut la modifier.',
	},
	{
		icon: UsersIcon,
		title: 'Gouvernance partagée',
		description:
			'Rôles fins : trésorier, président, membre, observateur. Permissions configurables par workspace.',
	},
	{
		icon: BarChart3Icon,
		title: 'Rapports automatiques',
		description:
			'Rapports mensuels, exports CSV, projections. Tout ce qu’il faut pour la AG de fin d’année.',
	},
]

const steps = [
	{
		title: 'Créez votre workspace',
		description:
			'Nom du groupe, devise, règles de cotisation. Miks configure tout pour vous en moins de 60 secondes.',
	},
	{
		title: 'Invitez vos membres',
		description:
			'Par lien ou email. Chaque membre crée son compte, vérifie son identité, et reçoit sa part initiale.',
	},
	{
		title: 'Pilotez en temps réel',
		description:
			'Cotisations, décaissements, alertes. Tout le monde voit la même chose au même moment.',
	},
]

const stats = [
	{ value: '12K+', label: 'Coopératives actives' },
	{ value: '€48M', label: 'Épargne gérée' },
	{ value: '99.9%', label: 'Disponibilité' },
	{ value: '<5min', label: 'Setup complet' },
]

const testimonials = [
	{
		quote:
			'Miks a remplacé 3 tableurs et un cahier physique. On a arrêté de se disputer sur les parts.',
		author: 'Aïcha R.',
		role: 'Trésorière — Tontine Lomé',
		initial: 'A',
	},
	{
		quote:
			'La double signature nous a évité une fraude de 200 000 FCFA. Le suspect n’a jamais pu valider.',
		author: 'Mohamed K.',
		role: 'Président — Coopérative agricole',
		initial: 'M',
	},
	{
		quote:
			'Mes 24 membres voient tous la même chose. Finies les "tu me dois combien" en boucle.',
		author: 'Sarah B.',
		role: 'Coordinatrice — GIE textile',
		initial: 'S',
	},
]

function Home() {
	return (
		<>
			<Header />
			<HeroSection />
			<TrustBand />
			<StatsBand stats={stats} />
			<div id="features">
				<FeaturesGrid features={features} />
			</div>
			<HowItWorks steps={steps} />
			<TestimonialsBand testimonials={testimonials} />
			<FinalCta
				title="Prêt à reprendre le contrôle de votre épargne collective ?"
				description="Rejoignez les centaines de coopératives qui font confiance à Miks pour sécuriser leur avenir financier."
				ctaLabel="Créer mon workspace"
				ctaTo="/auth/register"
			/>
		</>
	)
}