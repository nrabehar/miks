import miks from '#/assets/miks.svg'
import { Button } from '#/components/ui/button'
import { GoogleIcon } from '#/components/ui/google-icon'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="w-full min-h-screen font-sans bg-background sm:p-10 p-4 space-y-10 flex flex-col items-center justify-between">
			<div className="w-full grid grid-cols-3 items-center">
				<div></div>
				<Link
					to="/"
					className="flex gap-2 text-center justify-center items-center"
				>
					<img src={miks} alt="miks icon" className="w-7" />
					<h2 className="text-2xl font-semibold">miks</h2>
				</Link>
				<div className="flex justify-end">
					<div className="text-right">
						Vous découvrez Miks ?
						<br />
						<Link
							to="/auth/register"
							className="font-semibold text-primary hover:underline"
						>
							Créer un compte
						</Link>
					</div>
				</div>
			</div>
			<form className="flex flex-col grow shrink-0 items-center justify-center w-full max-w-3xl sm:gap-6 gap-4">
				<h1 className="text-center max-w-3xl sm:text-5xl text-3xl font-semibold leading-12">
					Saisissez votre adresse e-mail pour vous connecter
				</h1>
				<span className='text-muted-foreground'>Ou choisissez une autre méthode de connexion.</span>
				<div className="max-w-md items-center justify-center w-full flex flex-col gap-4">
					<Input
						type="email"
						placeholder="nom@work-email.com"
						className="w-full h-10"
					/>
					<Button
						className="w-full h-10 bg-primary text-white rounded-md cursor-pointer"
						type="submit"
					>
						Se connecter avec un e-mail
					</Button>
					<Separator />
					<div className="flex items-center justify-center w-full max-w-3xl gap-3">
						<Button
							size="lg"
							variant="outline"
							className="w-full h-10 flex items-center justify-center gap-2 cursor-pointer"
						>
							<GoogleIcon />
							Se connecter avec Google
						</Button>
					</div>
					<div className="text-center">
					Vous rencontrez des difficultés ? {' '}
					<Link
						to="/"
						className="font-semibold text-primary hover:underline"
					>
						Veuillez saisir une URL de l’espace de travail
					</Link>
					</div>
				</div>
			</form>
		</div>
	)
}
