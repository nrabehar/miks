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
import { useTranslation } from 'react-i18next'
import { BsFacebook } from 'react-icons/bs'
import { FcGoogle } from 'react-icons/fc'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/auth/register')({
	staticData: { title: 'Create account' },
	component: RegisterPage,
})

function RegisterPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const {
		handleSubmit,
		register,
		control,
		formState: { errors },
		setValue,
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
			const raw = err.response?.data?.message
			const msg = Array.isArray(raw)
				? raw.join(', ')
				: typeof raw === 'string'
					? raw
					: ''
			if (msg.toLowerCase().includes('already exists')) {
				toast.error(t('auth.register.errors.emailTaken'), {
					description: 'Try logging in instead.',
					action: { label: t('auth.login.title'), onClick: () => navigate({ to: '/auth/login' }) },
				})
			} else if (msg.toLowerCase().includes('cgu') || msg.toLowerCase().includes('accept')) {
				toast.error(t('auth.register.errors.cguRequired'))
			} else if (msg.toLowerCase().includes('strong') || msg.toLowerCase().includes('password')) {
				toast.error(t('auth.register.errors.weakPassword'))
			} else {
				toast.error(msg || t('auth.register.errors.generic'))
			}
		},
	})

	const passwordRules = [
		{ key: 'length', test: (p: string) => p.length >= 8 },
		{ key: 'uppercase', test: (p: string) => /[A-Z]/.test(p) },
		{ key: 'lowercase', test: (p: string) => /[a-z]/.test(p) },
		{ key: 'number', test: (p: string) => /[0-9]/.test(p) },
		{ key: 'special', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
	]

	return (
		<AuthCard
			title={t('auth.register.title')}
			description={t('auth.register.description')}
			footer={
				<>
					{t('auth.register.haveAccount')}{' '}
					<Link to="/auth/login" className="text-primary font-medium hover:underline">
						{t('auth.register.signIn')}
					</Link>
				</>
			}
		>
			<form
				onSubmit={handleSubmit(({ firstName, lastName, email, password }) =>
				mutation.mutate({ firstName, lastName, email, password })
			)}
				className="space-y-4"
			>
				<div className="grid grid-cols-2 gap-3">
					<Input
						label={t('auth.register.firstNameLabel')}
						placeholder={t('auth.register.firstNamePlaceholder')}
						autoComplete="given-name"
						error={errors.firstName?.message}
						{...register('firstName')}
					/>
					<Input
						label={t('auth.register.lastNameLabel')}
						placeholder={t('auth.register.lastNamePlaceholder')}
						autoComplete="family-name"
						error={errors.lastName?.message}
						{...register('lastName')}
					/>
				</div>

				<Input
					label={t('auth.register.emailLabel')}
					type="email"
					placeholder={t('auth.register.emailPlaceholder')}
					autoComplete="email"
					error={errors.email?.message}
					{...register('email')}
				/>

				<PasswordInput
					label={t('auth.register.passwordLabel')}
					autoComplete="new-password"
					placeholder={t('auth.register.passwordPlaceholder')}
					error={errors.password?.message}
					{...register('password')}
				/>

				<PasswordInput
					label={t('auth.register.confirmPasswordLabel')}
					autoComplete="new-password"
					placeholder={t('auth.register.passwordPlaceholder')}
					error={errors.confirmPassword?.message}
					{...register('confirmPassword')}
				/>

				{/* Password rules indicator */}
				{passwordValue && (
					<div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
						<p className="text-xs font-medium text-muted-foreground">
							{t('auth.register.passwordRules.title')}
						</p>
						<ul className="space-y-1">
							{passwordRules.map((rule) => {
								const passed = rule.test(passwordValue || '')
								return (
									<li
										key={rule.key}
										className={`flex items-center gap-2 text-xs ${passed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
									>
										{passed ? (
											<CheckIcon className="size-3.5" />
										) : (
											<XIcon className="size-3.5" />
										)}
										{t(`auth.register.passwordRules.${rule.key}`)}
									</li>
								)
							})}
						</ul>
					</div>
				)}

				<div className="flex items-start gap-2">
					<Checkbox
						id="cgu"
						{...register('cgu')}
						onCheckedChange={(checked) => {
							setValue('cgu', checked === true, { shouldValidate: true })
						}}
					/>
					<Label htmlFor="cgu" className="text-sm font-normal cursor-pointer leading-snug">
						{t('auth.register.cguLabel')}
					</Label>
				</div>
				{errors.cgu && (
					<p className="text-sm text-destructive">{errors.cgu.message}</p>
				)}

				<Button
					type="submit"
					size="lg"
					className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
					isLoading={mutation.isPending}
					loadingText={t('auth.register.submitting')}
				>
					{t('auth.register.submit')}
				</Button>
			</form>

			<div className="flex items-center gap-4">
				<div className="flex-1 border-t border-muted" />
				<span className="text-xs text-muted-foreground">{t('common.or')}</span>
				<div className="flex-1 border-t border-muted" />
			</div>

			<div className="grid grid-cols-2 gap-3">
				<SocialButton provider="google" icon={<FcGoogle className="size-5" />}>
					Google
				</SocialButton>
				<SocialButton provider="facebook" icon={<BsFacebook className="size-5 text-blue-600" />}>
					Facebook
				</SocialButton>
			</div>
		</AuthCard>
	)
}