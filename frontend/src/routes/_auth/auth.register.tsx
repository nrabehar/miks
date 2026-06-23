import { AuthCard } from '#/components/auth/auth-card'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { SocialButton } from '#/components/ui/social-button'
import { authApi } from '#/lib/api'
import { registerSchema } from '#/lib/validation/auth.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { BsFacebook } from 'react-icons/bs'
import { FcGoogle } from 'react-icons/fc'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/auth/register')({
	component: RegisterPage,
})

function RegisterPage() {
	const navigate = useNavigate()
	const {
		handleSubmit,
		register,
		formState: { errors },
		watch,
		setValue,
	} = useForm({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			firstName: '',
			lastName: '',
			email: '',
			phone: '',
			password: '',
			confirm: '',
			cgu: false as unknown as true,
		},
	})

	const mutation = useMutation({
		mutationFn: authApi.register,
		onSuccess: (data) => {
			sessionStorage.setItem('miks_registration_id', data.registrationId)
			toast.success('Account created. Check your email.')
			navigate({ to: '/auth/verify-email' })
		},
		onError: (err: any) => {
			const errMsg =
				err.response?.data?.message ||
				'Registration failed. Please check your input.'
			toast.error(errMsg)
		},
	})

	return (
		<AuthCard
			title="Create your account"
			description="Join MIKS and start your numeric cooperative"
			footer={
				<>
					Already have an account?{' '}
					<Link
						to="/auth/login"
						className="text-primary hover:underline font-medium"
					>
						Log in
					</Link>
				</>
			}
		>
			<form
				onSubmit={handleSubmit((v) => mutation.mutate(v))}
				className="space-y-2"
			>
				<div className="grid grid-cols-2 gap-4">
					<Input
						label="First Name"
						type="text"
						placeholder="John"
						error={errors.firstName?.message}
						{...register('firstName')}
					/>

					<Input
						label="Last Name"
						type="text"
						placeholder="Doe"
						error={errors.lastName?.message}
						{...register('lastName')}
					/>
				</div>
				<Input
					label="Email"
					type="email"
					placeholder="example@miks.mg"
					error={errors.email?.message}
					{...register('email')}
				/>
				<Input
					label="Phone"
					type="tel"
					placeholder="+261340000000"
					error={errors.phone?.message}
					{...register('phone')}
				/>
				<Input
					label="Password"
					type="password"
					placeholder="Your password"
					error={errors.password?.message}
					{...register('password')}
					helperText="Must have a higher case, lower and number."
				/>
				<Input
					label="Confirm Password"
					type="password"
					placeholder="Confirm your password"
					error={errors.confirm?.message}
					{...register('confirm')}
				/>
				<div className="flex items-start gap-2">
					<Checkbox
						id="cgu"
						checked={watch('cgu') as unknown as boolean}
						onCheckedChange={(c) =>
							setValue('cgu', (c === true) as unknown as true, {
								shouldValidate: true,
							})
						}
					/>
					<Label
						htmlFor="cgu"
						className="text-xs leading-snug font-normal text-muted-foreground"
					>
						J'accepte les Conditions Générales d'Utilisation et la
						Politique de Confidentialité.
					</Label>
				</div>
				<Button
					variant="secondary"
					type="submit"
					size="lg"
					className="w-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
					isLoading={mutation.isPending}
					loadingText="Creating..."
				>
					Create account
				</Button>
			</form>
			<div>
				<div className="flex items-center my-6">
					<div className="grow border-t border-muted"></div>
					<span className="mx-4 text-sm text-muted-foreground">
						OR
					</span>
					<div className="grow border-t border-muted"></div>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<SocialButton
					icon={<FcGoogle />}
					provider="Google"
					className="w-full"
				/>
				<SocialButton
					icon={<BsFacebook color="#1877F2" />}
					provider="Facebook"
					className="w-full"
				/>
			</div>
		</AuthCard>
	)
}
