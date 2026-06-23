import { Link } from '@tanstack/react-router'

export const Header = () => {
	return (
		<nav className="fixed w-full top-0 z-50 bg-background/20 backdrop-blur-sm p-4">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between">
					{/* Logo */}
					<Link to="/" className="text-xl font-bold">
						Miks
					</Link>
					{/* Navigation Links */}
					<ul className="hidden md:flex items-center gap-7">
						<li>
							<a
								href="#features"
								className="text-sm font-medium hover:text-primary"
							>
								Features
							</a>
						</li>
						<li>
							<a
								href="#pricing"
								className="text-sm font-medium hover:text-primary"
							>
								Pricing
							</a>
						</li>
						<li>
							<a
								href="#about"
								className="text-sm font-medium hover:text-primary"
							>
								About
							</a>
						</li>
					</ul>
					{/* Login and Register */}
					<div className="flex items-center gap-2">
						<Link
							to="/auth/login"
							className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
						>
							Connexion
						</Link>
						<Link
							to='/auth/register'
							className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg hover:bg-primary transition-colors font-medium shadow-sm"
						>
							Créer un Workspace
						</Link>
					</div>
				</div>
			</div>
		</nav>
	)
}
