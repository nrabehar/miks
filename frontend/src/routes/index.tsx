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
import { PricingSection } from '#/components/landing/PricingSection'
import { FaqSection } from '#/components/landing/FaqSection'
import { ScrollProgress } from '#/components/landing/ScrollProgress'
import { CursorFollower } from '#/components/landing/CursorFollower'
import { createFileRoute } from '@tanstack/react-router'
import {
	BarChart3Icon,
	FolderLockIcon,
	LineChartIcon,
	PiggyBankIcon,
	ShieldCheckIcon,
	UsersIcon,
	WalletIcon,
} from 'lucide-react'

export const Route = createFileRoute('/')({
	staticData: { title: 'Cooperative banking infrastructure' },
	component: Home,
})

const features = [
	{ icon: PiggyBankIcon, i18nKey: 'autoContributions' },
	{ icon: WalletIcon, i18nKey: 'vaults' },
	{ icon: ShieldCheckIcon, i18nKey: 'doubleSignature' },
	{ icon: LineChartIcon, i18nKey: 'realTimeShares' },
	{ icon: FolderLockIcon, i18nKey: 'audit' },
	{ icon: UsersIcon, i18nKey: 'governance' },
	{ icon: BarChart3Icon, i18nKey: 'reports' },
]

const steps = [
	{ i18nKey: 'workspace' },
	{ i18nKey: 'invite' },
	{ i18nKey: 'operate' },
]

const stats = [
	{ value: '12K+', labelKey: 'landing.stats.cooperatives' },
	{ value: '€48M', labelKey: 'landing.stats.savings' },
	{ value: '99.9%', labelKey: 'landing.stats.uptime' },
	{ value: '<5min', labelKey: 'landing.stats.setup' },
]

const testimonials = [
	{
		quoteKey: 'landing.testimonials.1.quote',
		author: 'Aïcha R.',
		role: 'Trésorière — Tontine Lomé',
		initial: 'A',
	},
	{
		quoteKey: 'landing.testimonials.2.quote',
		author: 'Mohamed K.',
		role: 'Président — Coopérative agricole',
		initial: 'M',
	},
	{
		quoteKey: 'landing.testimonials.3.quote',
		author: 'Sarah B.',
		role: 'Coordinatrice — GIE textile',
		initial: 'S',
	},
]

const plans = [
	{
		i18nKey: 'free',
		features: ['upTo10', 'basicReports', 'prioritySupport'],
	},
	{
		i18nKey: 'cooperative',
		featured: true,
		features: [
			'upTo100',
			'advancedReports',
			'multiWorkspace',
			'prioritySupport',
			'auditExport',
		],
	},
	{
		i18nKey: 'federation',
		features: [
			'unlimited',
			'advancedReports',
			'multiWorkspace',
			'sso',
			'auditExport',
		],
	},
]

const faqItems = [
	{ i18nKey: 'dataSecurity' },
	{ i18nKey: 'doubleSignature' },
	{ i18nKey: 'pricing' },
	{ i18nKey: 'migration' },
	{ i18nKey: 'language' },
]

function Home() {
	return (
		<>
			<ScrollProgress />
			<CursorFollower />
			<Header />
			<HeroSection />
			<TrustBand />
			<StatsBand stats={stats} />
			<div id="features">
				<FeaturesGrid features={features} />
			</div>
			<HowItWorks steps={steps} />
			<PricingSection plans={plans} />
			<FaqSection items={faqItems} />
			<TestimonialsBand testimonials={testimonials} />
			<FinalCta ctaTo="/auth/register" />
		</>
	)
}