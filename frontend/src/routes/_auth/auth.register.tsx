import { AuthCard } from '#/components/auth/auth-card'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { PasswordInput } from '#/components/ui/password-input'
import { SocialButton } from '#/components/ui/social-button'
import { authApi } from '#/lib/api'
import { registerSchema } from '#/lib/validation/auth.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { CheckIcon, XIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { BsFacebook } from 'react-icons/bs'
import { FcGoogle } from 'react-icons/fc'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/auth/register')({
	component: RegisterPage,
})

const passwordRules = [
	{ label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
	{ label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
	{ label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
	{ label: 'Number', test: (p: string) => /[0-9]/.test(p) },
	{ label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function RegisterPage() {
	const navigate = useNavigate()
	const {
		handleSubmit,
		register,
		control,
		formState: { errors },
		setValue,
		watch,
	} = useForm({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			firstName: '',
			lastName: '',
			email: '',
			password: '',
			cgu: false,
		},
	})

	const passwordValue = useWatch({ control, name: 'password' })

	const mutation = useMutation({
		mutationFn: authApi.register,
		onSuccess: (data, variables) => {
			sessionStorage.setItem('miks_registration_id', data.registrationId)
			sessionStorage.setItem('miks_registration_email', variables.email)
			toast.success('Account created! Check your email for a verification code.')
			navigate({ to: '/auth/verify-email' })
		},
		onError: (err: any) => {
			const msg: string = err.response?.data?.message ?? ''
			if (msg.toLowerCase().includes('already exists')) {
				toast.error('An account with this email already exists.', {
					description: 'Try logging in instead.',
					action: { label: 'Log in', onClick: () => navigate({ to: '/auth/login' }) },
				})
			} else {
				toast.error(msg || 'Registration failed. Please try again.')
			}
		},
	})

	return (
		<AuthCard
			title="Create your account"
			description="Join MIKS and digitise your cooperative group"
			footer={
				<>
					Already have an account?{' '}
					<Link to="/auth/login" className="text-primary hover:underline font-medium">
						Sign in
					</Link>
				</>
			}
		>
			<form
				onSubmit={handleSubmit((v) => mutation.mutate(v))}
				className="space-y-4"
			>
				<div className="grid grid-cols-2 gap-3">
					<Input
						label="First name"
						placeholder="John"
						autoComplete="given-name"
						error={errors.firstName?.message}
						{...register('firstName')}
					/>
					<Input
						label="Last name"
						placeholder="Doe"
						autoComplete="family-name"
						error={errors.lastName?.message}
						{...register('lastName')}
					/>
				</div>

				<Input
					label="Email address"
					type="email"
					placeholder="example@miks.mg"
					autoComplete="email"
					error={errors.email?.message}
					{...register('email')}
				/>

				<div className="space-y-2">
					<PasswordInput
						label="Password"
						autoComplete="new-password"
						placeholder="Create a strong password"
						error={errors.password?.message}
						{...register('password')}
					/>
					{passwordValue && (
						<ul className="grid grid-cols-2 gap-1 pt-1">
							{passwordRules.map((rule) => {
								const ok = rule.test(passwordValue)
								return (
									<li
										key={rule.label}
										className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
									>
										{ok ? <CheckIcon className="size-3" /> : <XIcon className="size-3 opacity-40" />}
										{rule.label}
									</li>
								)
							})}
						</ul>
					)}
				</div>

				<div className="flex items-start gap-2 pt-1">
					<Checkbox
						id="cgu"
						checked={watch('cgu')}
						onCheckedChange={(c) =>
							setValue('cgu', c === true, { shouldValidate: true })
						}
					/>
					<div className="space-y-0.5">
						<Label
							htmlFor="cgu"
							className="text-xs leading-snug font-normal text-muted-foreground cursor-pointer"
						>
							I accept the{' '}
							<span className="text-primary hover:underline cursor-pointer">Terms of Service</span>
							{' '}and{' '}
							<span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>.
						</Label>
						{errors.cgu && (
							<p className="text-xs text-destructive" role="alert">
								{errors.cgu.message}
							</p>
						)}
					</div>
				</div>

				<Button
					type="submit"
					size="lg"
					className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
					isLoading={mutation.isPending}
					loadingText="Creating account..."
				>
					Create account
				</Button>
			</form>

			<div className="flex items-center gap-4">
				<div className="flex-1 border-t border-muted" />
				<span className="text-xs text-muted-foreground">or continue with</span>
				<div className="flex-1 border-t border-muted" />
			</div>

			<div className="grid grid-cols-2 gap-3">
				<SocialButton
					icon={<FcGoogle />}
					provider="Google"
					className="w-full opacity-50 cursor-not-allowed"
					disabled
					title="Coming soon"
				/>
				<SocialButton
					icon={<BsFacebook color="#1877F2" />}
					provider="Facebook"
					className="w-full opacity-50 cursor-not-allowed"
					disabled
					title="Coming soon"
				/>
			</div>
		</AuthCard>
	)
}
