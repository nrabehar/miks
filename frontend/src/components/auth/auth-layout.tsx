import LogoImg from '#/assets/miks.svg'
import { Outlet } from '@tanstack/react-router'
import { MiksLogo } from '../brand/logo'

export const AuthLayout = () => {
	return (
		<div className="grid min-h-screen lg:grid-cols-2">
			<aside className="relative hidden overflow-hidden bg-linear-to-br from-primary/30 via-accent/15 to-background lg:flex lg:flex-col lg:justify-between lg:p-12">
				<div className="flex items-center gap-3">
					<MiksLogo className="h-8 w-8" />
					<span className="text-2xl font-bold tracking-tight">
						MIKS
					</span>
				</div>
				<div className="relative z-10 max-w-md">
					<h2 className="text-4xl font-bold leading-tight tracking-tight">
						The operating system for autonomous cooperatives.
					</h2>
					<p className="mt-4 text-muted-foreground">
						{/* Grand Livre numérique immuable, gouvernance horodatée,
						et trésorerie transparente pour vos groupes tontine. */}
						Immutable digital ledger, timestamped governance, and
						transparent treasury for your cooperative groups.
					</p>
				</div>
				<div className="pointer-events-none absolute bottom-10 -right-32 h-122 w-md opacity-10">
					<MiksLogo className="h-full w-full" />
				</div>
				<p className="relative z-10 text-sm text-muted-foreground">
					© {new Date().getFullYear()} MIKS
				</p>
			</aside>
			<div className="flex flex-1 items-center justify-center p-8 lg:p-12">
				<div className="w-full max-w-md">
					<div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
						<img
							src={LogoImg}
							alt="Miks Logo"
							className="h-8 w-8"
						/>
						<span className="text-xl font-semibold tracking-tight">
							MIKS
						</span>
					</div>
					<Outlet />
				</div>
			</div>
		</div>
	)
}
