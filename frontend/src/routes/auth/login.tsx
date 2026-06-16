import logo from '#/assets/miks.svg'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { BsFacebook } from 'react-icons/bs'
import { FcGoogle } from 'react-icons/fc'
import z from 'zod'

export const Route = createFileRoute('/auth/login')({
	component: RouteComponent,
})

function RouteComponent() {
	const [error, setError] = useState<string | null>(null)

	const formSchema = z.object({
		email: z.email({ message: 'Invalid email address' }),
	})

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { email: '' },
	})

	const onSubmit = (data: z.infer<typeof formSchema>) => {
		console.log('Form Data:', data)
		// Handle form submission, e.g., send data to the server
	}

	return (
		<div className="w-full min-h-screen font-sans p-5 grid text-center place-content-center">
			<div className="max-w-md">
				<div className="flex justify-center items-center gap-3 mb-4">
					<img src={logo} alt="Logo" className="w-9 h-9" />
					<h2 className="text-2xl font-bold">Miks</h2>
				</div>
				<h2 className="text-lg font-semibold mb-2">
					Sign in to your Miks
				</h2>
				<p className="text-sm text-muted-foreground mb-6">
					We suggest using the email address that you use at your
					organization.
				</p>

				<div className="flex items-center justify-center space-x-4 w-full">
					<Button
						variant="outline"
						size="lg"
						className="cursor-pointer"
					>
						<FcGoogle />
						Sign in with Google
					</Button>
					<Button
						variant="outline"
						size="lg"
						className="cursor-pointer"
					>
						<BsFacebook />
						Sign in with Facebook
					</Button>
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
						// label="Email"
						type="email"
						placeholder="your@email.com"
						// icon={<Mail size={18} />}
						// error={errors.email?.message}
						{...register('email')}
						className="w-full h-10"
					/>
					{error && (
						<div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
							{error}
						</div>
					)}

					<Button
						type="submit"
						size="lg"
						className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
					>
						Sign In
					</Button>
				</form>
			</div>
		</div>
	)
}
