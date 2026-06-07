import { Header } from '#/components/page/landing/Header'
import { HeroSection } from '#/components/page/landing/HeroSection'
import { TrustBand } from '#/components/page/landing/TrustBand'
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
