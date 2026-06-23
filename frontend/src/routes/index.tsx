import { Header } from '#/components/landing/Header'
import { HeroSection } from '#/components/landing/HeroSection'
import { TrustBand } from '#/components/landing/TrustBand'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
	return (
		<>
			<Header />
			<HeroSection />
			<TrustBand />
		</>
	)
}
