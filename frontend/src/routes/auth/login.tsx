import logo from '#/assets/miks.svg'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { SocialButton } from '#/components/ui/social-button'
import { loginSchema, type LoginFormData } from '#/lib/validation/auth.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { BsFacebook } from 'react-icons/bs'
import { FcGoogle } from 'react-icons/fc'

export const Route = createFileRoute('/auth/login')({
	component: RouteComponent,
})

function RouteComponent() {
	const [error, setError] = useState<string | null>(null)

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: '', password: '' },
	})

	const onSubmit = (data: LoginFormData) => {
		console.log('Form Data:', data)
		// Handle form submission, e.g., send data to the server
	}

	return (
		<div className="w-full min-h-screen font-sans p-5 grid place-content-center">
			<div className="max-w-md">
				<div className="flex justify-center items-center gap-3 mb-4">
					<img src={logo} alt="Logo" className="w-9 h-9" />
					<h2 className="text-2xl font-bold">Miks</h2>
				</div>
				<h2 className="text-3xl font-semibold mb-2 mx-auto text-center">
					Sign in to your Miks
				</h2>
				<p className="text-sm text-muted-foreground mb-6">
					We suggest using the email address that you use at your
					organization.
				</p>

				<div className="w-full grid grid-cols-2 gap-4">
					<SocialButton
						icon={<FcGoogle />}
						provider="Google"
						prefix="Sign in with"
					/>
					<SocialButton
						icon={<BsFacebook color="#1877F2" />}
						provider="Facebook"
						prefix="Sign in with"
					/>
				</div>

				<div>
					<div className="flex items-center my-6">
						<div className="grow border-t border-muted"></div>
						<span className="mx-4 text-sm text-muted-foreground">
							OR
						</span>
						<div className="grow border-t border-muted"></div>
					</div>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
					<Input
						type="email"
						placeholder="name@email.com"
						icon={<Mail size={18} />}
						error={errors.email?.message}
						{...register('email')}
						className="w-full h-10"
					/>

					<Input
						type="password"
						placeholder="Your password"
						icon={<Lock size={18} />}
						error={errors.password?.message}
						{...register('password')}
						className="w-full h-10"
					/>

					{error && (
						<div className="rounded-lg border border-destructive/10 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{error}
						</div>
					)}

					<div className="flex items-center justify-between">
						<Checkbox
							label="Remember me"
							{...register('rememberMe')}
						/>
						<Link
							to="/"
							className="text-sm text-primary-400 transition-colors hover:text-primary-300"
						>
							Forgot password?
						</Link>
					</div>

					<Button
						variant="secondary"
						type="submit"
						size="lg"
						className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
					>
						Sign in with Email
					</Button>
				</form>
			</div>
		</div>
	)
}
